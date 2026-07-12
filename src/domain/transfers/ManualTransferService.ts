import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase";

export interface ManualTransferInput {
  schoolName: string;
  reason: string;
  effectiveDate: string; // ISO yyyy-mm-dd
}

/**
 * Transfer OUT to a school that is NOT on SIMS: no digital envelope, no
 * receiving inbox - the paperwork travels with the student (transfer
 * letter + certificate + transcript, all printable). SIMS's job is to
 * close the record properly: student and enrollments become
 * "transferred" (dropping rosters/score sheets, keeping all history)
 * and the destination is remembered for the printed documents.
 */
export class ManualTransferService {
  static async transferOut(
    schoolCode: string,
    studentNumber: string,
    input: ManualTransferInput
  ): Promise<void> {
    if (!input.schoolName.trim())
      throw new Error("Enter the receiving school's name.");
    if (!input.reason.trim()) throw new Error("A reason is required.");

    const enrollSnap = await getDocs(
      query(
        collection(db, "schools", schoolCode, "enrollments"),
        where("studentId", "==", studentNumber)
      )
    );

    const batch = writeBatch(db);
    batch.update(doc(db, "schools", schoolCode, "students", studentNumber), {
      status: "transferred",
      transferredTo: {
        schoolName: input.schoolName.trim(),
        effectiveDate: input.effectiveDate,
        reason: input.reason.trim(),
        manual: true,
      },
      updatedAt: serverTimestamp(),
    });
    for (const d of enrollSnap.docs) {
      if (d.data().status === "active") {
        batch.update(d.ref, {
          status: "transferred",
          updatedAt: serverTimestamp(),
        });
      }
    }
    await batch.commit();
  }
}
