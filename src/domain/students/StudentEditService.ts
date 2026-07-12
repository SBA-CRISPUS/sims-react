import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase";

export interface StudentEditPatch {
  firstName: string;
  lastName: string;
  otherNames?: string;
  gender: "Male" | "Female";
  dateOfBirth: Date;
  nationality: string;
}

/**
 * Corrects a student's PERSONAL details after admission - the typo /
 * wrong-DOB fix that every school needs in week one. Identity and
 * lifecycle fields are deliberately NOT editable here: student and
 * admission numbers plus the SIMS Learner ID are permanent, status is
 * driven by workflows (transfers), and examination numbers have their
 * own page. Every change lands in updatedAt and the student audit
 * trail keeps the history of admissions-time values.
 */
export class StudentEditService {
  static async updateDetails(
    schoolCode: string,
    studentNumber: string,
    patch: StudentEditPatch
  ): Promise<void> {
    if (!patch.firstName.trim() || !patch.lastName.trim()) {
      throw new Error("First and last name are required.");
    }
    if (Number.isNaN(patch.dateOfBirth.getTime())) {
      throw new Error("Enter a valid date of birth.");
    }
    await updateDoc(doc(db, "schools", schoolCode, "students", studentNumber), {
      firstName: patch.firstName.trim(),
      lastName: patch.lastName.trim(),
      otherNames: patch.otherNames?.trim() ?? "",
      gender: patch.gender,
      dateOfBirth: patch.dateOfBirth,
      nationality: patch.nationality.trim() || "Zambian",
      updatedAt: serverTimestamp(),
    });
  }

  /** Withdraws a student (left the school outside the transfer system)
   * or reverses it. Flips student.status AND the matching enrollments -
   * "withdrawn" enrollments drop out of rosters and score sheets, while
   * the record and history stay forever. The occupancy Cloud Function
   * recounts streams from the enrollment writes. */
  static async setWithdrawn(
    schoolCode: string,
    studentNumber: string,
    withdrawn: boolean
  ): Promise<void> {
    const enrollSnap = await getDocs(
      query(
        collection(db, "schools", schoolCode, "enrollments"),
        where("studentId", "==", studentNumber)
      )
    );
    const batch = writeBatch(db);
    batch.update(doc(db, "schools", schoolCode, "students", studentNumber), {
      status: withdrawn ? "withdrawn" : "active",
      updatedAt: serverTimestamp(),
    });
    for (const d of enrollSnap.docs) {
      const status = d.data().status;
      if (withdrawn ? status === "active" : status === "withdrawn") {
        batch.update(d.ref, {
          status: withdrawn ? "withdrawn" : "active",
          updatedAt: serverTimestamp(),
        });
      }
    }
    await batch.commit();
  }

  /** Reverses a MANUAL transfer out recorded in error - the record has
   * no counterpart at another school to un-notify, so this simply
   * restores the student to "active" and reactivates the enrollments
   * that were closed by the transfer (mirrors setWithdrawn's
   * reactivate half).
   *
   * Digital transfers are NEVER reversible here: once the receiving
   * school accepts, onTransferAccepted has already created a real
   * student record there. Blindly reactivating a "transferred"
   * enrollment would silently duplicate the learner across two
   * schools, so this refuses unless student.transferredTo.manual is
   * actually set - a self-check, not just a UI gate. */
  static async undoManualTransfer(
    schoolCode: string,
    studentNumber: string
  ): Promise<void> {
    const studentSnap = await getDoc(
      doc(db, "schools", schoolCode, "students", studentNumber)
    );
    if (!studentSnap.data()?.transferredTo?.manual) {
      throw new Error(
        "This student was not transferred out manually - a digital transfer cannot be undone here."
      );
    }

    const enrollSnap = await getDocs(
      query(
        collection(db, "schools", schoolCode, "enrollments"),
        where("studentId", "==", studentNumber)
      )
    );
    const batch = writeBatch(db);
    batch.update(doc(db, "schools", schoolCode, "students", studentNumber), {
      status: "active",
      transferredTo: deleteField(),
      updatedAt: serverTimestamp(),
    });
    for (const d of enrollSnap.docs) {
      if (d.data().status === "transferred") {
        batch.update(d.ref, { status: "active", updatedAt: serverTimestamp() });
      }
    }
    await batch.commit();
  }
}
