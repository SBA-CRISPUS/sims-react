import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  updateDoc,
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
}
