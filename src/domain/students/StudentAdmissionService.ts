import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../firebase";

import type { StudentAdmissionRequest } from "./StudentAdmissionRequest";

export interface AdmissionResult {
  studentNumber: string;
  guardianId: string;
  admissionId: string;
}

function pad(n: number): string {
  return String(n).padStart(6, "0");
}

/**
 * Admits a learner in a single Firestore transaction: guardian,
 * student, enrollment, and the three school-local counters all commit
 * together or not at all - no orphaned records if a write fails.
 *
 * Number generation reads the counters inside the transaction, so this
 * flow requires connectivity (runTransaction cannot run offline). The
 * audit-log entry is written server-side by the onStudentAdmitted
 * Cloud Function trigger - client writes to auditLogs are denied by the
 * security rules on purpose.
 */
export class StudentAdmissionService {
  static async admit(
    schoolCode: string,
    actorUid: string,
    request: StudentAdmissionRequest
  ): Promise<AdmissionResult> {
    const year = new Date().getFullYear();

    const counters = collection(db, "schools", schoolCode, "counters");
    const studentsCounterRef = doc(counters, "students");
    const guardiansCounterRef = doc(counters, "guardians");
    const admissionsCounterRef = doc(counters, `admissions-${year}`);

    return runTransaction(db, async (tx) => {
      // All reads must precede all writes in a transaction.
      const studentsSnap = await tx.get(studentsCounterRef);
      const guardiansSnap = await tx.get(guardiansCounterRef);
      const admissionsSnap = await tx.get(admissionsCounterRef);

      const nextStudent = (studentsSnap.data()?.current ?? 0) + 1;
      const nextGuardian = (guardiansSnap.data()?.current ?? 0) + 1;
      const nextAdmission = (admissionsSnap.data()?.current ?? 0) + 1;

      const studentNumber = `STU-${pad(nextStudent)}`;
      const guardianId = `GRD-${pad(nextGuardian)}`;
      const admissionId = `ADM-${year}-${pad(nextAdmission)}`;

      const guardianRef = doc(db, "schools", schoolCode, "guardians", guardianId);
      const studentRef = doc(db, "schools", schoolCode, "students", studentNumber);
      const enrollmentRef = doc(collection(db, "schools", schoolCode, "enrollments"));

      tx.set(guardianRef, {
        guardianId,
        ...request.guardian,
        studentNumbers: [studentNumber],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tx.set(studentRef, {
        studentNumber,
        admissionId,
        guardianIds: [guardianId],
        admittedByUid: actorUid,
        ...request.student,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tx.set(enrollmentRef, {
        studentId: studentNumber,
        admissionId,
        ...request.enrollment,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tx.set(studentsCounterRef, { current: nextStudent }, { merge: true });
      tx.set(guardiansCounterRef, { current: nextGuardian }, { merge: true });
      tx.set(admissionsCounterRef, { current: nextAdmission }, { merge: true });

      return { studentNumber, guardianId, admissionId };
    });
  }
}
