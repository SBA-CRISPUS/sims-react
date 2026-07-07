import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase";

import { streamId } from "./Stream";
import type { Stream, StreamInput } from "./Stream";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === "function" ? maybe.toDate() : undefined;
}

function mapStream(data: Record<string, unknown>): Stream {
  return {
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as unknown as Stream;
}

export class StreamService {
  /** All streams for a school in one read (flat collection). */
  static async listStreams(schoolCode: string): Promise<Stream[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "streams")
    );
    return snapshot.docs
      .map((d) => mapStream(d.data()))
      .sort(
        (a, b) =>
          a.academicLevelCode.localeCompare(b.academicLevelCode) ||
          a.streamCode.localeCompare(b.streamCode)
      );
  }

  static async createStream(
    schoolCode: string,
    input: StreamInput
  ): Promise<void> {
    const code = input.streamCode.trim().toUpperCase();
    const id = streamId(input.academicLevelCode, code);
    const ref = doc(db, "schools", schoolCode, "streams", id);

    // Create-only: a stale-cache/concurrent duplicate must fail loudly.
    await runTransaction(db, async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists()) {
        throw new Error(
          `Stream ${code} already exists for this level.`
        );
      }
      tx.set(ref, {
        streamId: id,
        academicLevelCode: input.academicLevelCode,
        streamCode: code,
        name: input.name.trim() || code,
        capacity: input.capacity,
        occupiedCount: 0,
        classTeacherId: null,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  static async updateStream(
    schoolCode: string,
    id: string,
    patch: Partial<Pick<Stream, "name" | "capacity" | "active">>
  ): Promise<void> {
    await updateDoc(doc(db, "schools", schoolCode, "streams", id), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Fixes a mistyped stream CODE. The doc id embeds the code
   * ({level}-{code}), so a rename is create-new + move-enrollments +
   * delete-old, committed as ONE atomic batch (no window where learners
   * point at a missing stream). onEnrollmentWritten recounts the new
   * stream's occupancy from the moved enrollments.
   *
   * Refused once teaching assignments or SBA sheets reference the stream -
   * their deterministic ids embed the composite stream id and cannot be
   * renamed. Fix codes early; after that, deactivate + create new.
   */
  static async renameStream(
    schoolCode: string,
    oldId: string,
    input: { streamCode: string; name: string; capacity: number; active: boolean }
  ): Promise<void> {
    const newCode = input.streamCode.trim().toUpperCase();

    const oldRef = doc(db, "schools", schoolCode, "streams", oldId);
    const oldSnap = await getDoc(oldRef);
    if (!oldSnap.exists()) throw new Error("Stream not found.");
    const old = mapStream(oldSnap.data());

    const newId = streamId(old.academicLevelCode, newCode);
    if (newId === oldId) return;
    const newRef = doc(db, "schools", schoolCode, "streams", newId);
    if ((await getDoc(newRef)).exists()) {
      throw new Error(`Stream ${newCode} already exists for this level.`);
    }

    const [assignments, sheets] = await Promise.all([
      getDocs(
        query(
          collection(db, "schools", schoolCode, "teachingAssignments"),
          where("streamId", "==", oldId)
        )
      ),
      getDocs(
        query(
          collection(db, "schools", schoolCode, "sbaSubmissions"),
          where("streamId", "==", oldId)
        )
      ),
    ]);
    if (!assignments.empty || !sheets.empty) {
      throw new Error(
        `${old.streamCode} already has ${
          !sheets.empty ? "SBA sheets" : "teaching assignments"
        } recorded against it and can't be renamed. Deactivate it and create a new stream instead.`
      );
    }

    // Enrollments store the stream CODE; move them to the new one.
    const enrollments = await getDocs(
      query(
        collection(db, "schools", schoolCode, "enrollments"),
        where("streamId", "==", old.streamCode)
      )
    );
    const affected = enrollments.docs.filter(
      (d) => d.data().academicLevelCode === old.academicLevelCode
    );

    const batch = writeBatch(db);
    batch.set(newRef, {
      streamId: newId,
      academicLevelCode: old.academicLevelCode,
      streamCode: newCode,
      name: input.name.trim() === old.streamCode ? newCode : input.name.trim() || newCode,
      capacity: input.capacity,
      occupiedCount: 0, // recounted by the CF from the moved enrollments
      classTeacherId: old.classTeacherId ?? null,
      active: input.active,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    affected.forEach((d) =>
      batch.update(d.ref, { streamId: newCode, updatedAt: serverTimestamp() })
    );
    batch.delete(oldRef);
    await batch.commit();
  }
}
