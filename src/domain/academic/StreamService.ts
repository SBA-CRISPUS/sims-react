import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../firebase";

import type { AcademicLevel } from "./AcademicLevel";
import type { Stream, StreamInput } from "./Stream";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === "function" ? maybe.toDate() : undefined;
}

export class StreamService {
  static async listLevels(schoolCode: string): Promise<AcademicLevel[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "academicLevels")
    );
    return snapshot.docs
      .map((d) => d.data() as AcademicLevel)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  static async listStreams(
    schoolCode: string,
    levelCode: string
  ): Promise<Stream[]> {
    const snapshot = await getDocs(
      collection(
        db,
        "schools",
        schoolCode,
        "academicLevels",
        levelCode,
        "streams"
      )
    );
    return snapshot.docs
      .map(
        (d) =>
          ({
            ...d.data(),
            createdAt: toDate(d.data().createdAt),
            updatedAt: toDate(d.data().updatedAt),
          }) as Stream
      )
      .sort((a, b) => a.streamCode.localeCompare(b.streamCode));
  }

  static async createStream(
    schoolCode: string,
    levelCode: string,
    input: StreamInput
  ): Promise<void> {
    const streamCode = input.streamCode.trim().toUpperCase();
    const ref = doc(
      db,
      "schools",
      schoolCode,
      "academicLevels",
      levelCode,
      "streams",
      streamCode
    );

    // Create-only: a stale-cache/concurrent duplicate must fail loudly,
    // not silently overwrite the existing stream (which would reset its
    // occupancy counter and class teacher).
    await runTransaction(db, async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists()) {
        throw new Error(`Stream ${streamCode} already exists for this level.`);
      }
      tx.set(ref, {
        streamCode,
        name: input.name.trim() || streamCode,
        capacity: input.capacity,
        current: 0,
        classTeacherId: null,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  static async updateStream(
    schoolCode: string,
    levelCode: string,
    streamCode: string,
    patch: Partial<Pick<Stream, "name" | "capacity" | "active">>
  ): Promise<void> {
    await updateDoc(
      doc(
        db,
        "schools",
        schoolCode,
        "academicLevels",
        levelCode,
        "streams",
        streamCode
      ),
      {
        ...patch,
        updatedAt: serverTimestamp(),
      }
    );
  }
}
