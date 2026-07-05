import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../firebase";

import { assignmentId } from "./TeachingAssignment";
import type {
  TeachingAssignment,
  TeachingAssignmentInput,
} from "./TeachingAssignment";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === "function" ? maybe.toDate() : undefined;
}

export class TeachingAssignmentService {
  static async listAssignments(
    schoolCode: string
  ): Promise<TeachingAssignment[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "teachingAssignments")
    );
    return snapshot.docs.map(
      (d) =>
        ({
          ...d.data(),
          createdAt: toDate(d.data().createdAt),
          updatedAt: toDate(d.data().updatedAt),
        }) as TeachingAssignment
    );
  }

  /**
   * Creates or reassigns the (subject, stream, term) slot. The
   * deterministic id means reassigning a slot to another teacher
   * updates it rather than creating a duplicate. createdAt/createdByUid
   * are preserved across reassignments (they mark the slot's origin,
   * not the last edit).
   */
  static async saveAssignment(
    schoolCode: string,
    actorUid: string,
    input: TeachingAssignmentInput
  ): Promise<void> {
    const id = assignmentId(input);
    const ref = doc(db, "schools", schoolCode, "teachingAssignments", id);

    await runTransaction(db, async (tx) => {
      const existing = await tx.get(ref);
      const createdAt = existing.exists()
        ? existing.data().createdAt
        : serverTimestamp();
      const createdByUid = existing.exists()
        ? existing.data().createdByUid
        : actorUid;

      tx.set(ref, {
        id,
        ...input,
        active: true,
        createdByUid,
        createdAt,
        updatedAt: serverTimestamp(),
      });
    });
  }

  static async deactivateAssignment(
    schoolCode: string,
    id: string
  ): Promise<void> {
    await updateDoc(
      doc(db, "schools", schoolCode, "teachingAssignments", id),
      { active: false, updatedAt: serverTimestamp() }
    );
  }
}
