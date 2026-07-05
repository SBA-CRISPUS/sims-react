import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

import { db } from "../../firebase";

import type { TeacherRegistrationRequest } from "./Teacher";

export interface TeacherRegistrationResult {
  employeeNumber: string;
}

function pad(n: number): string {
  return String(n).padStart(6, "0");
}

/**
 * Registers a staff member in a single transaction: the teacher record
 * and the school-local teacher counter commit together (same pattern as
 * student admission). Employee numbers are EMP-000001, ...
 */
export class TeacherRegistrationService {
  static async register(
    schoolCode: string,
    actorUid: string,
    request: TeacherRegistrationRequest
  ): Promise<TeacherRegistrationResult> {
    const counterRef = doc(db, "schools", schoolCode, "counters", "teachers");

    return runTransaction(db, async (tx) => {
      const counterSnap = await tx.get(counterRef);
      const next = (counterSnap.data()?.current ?? 0) + 1;
      const employeeNumber = `EMP-${pad(next)}`;

      const teacherRef = doc(
        db,
        "schools",
        schoolCode,
        "teachers",
        employeeNumber
      );

      // Guard against a counter that has drifted below the real max id:
      // deletes are disabled precisely to protect staff records, so never
      // overwrite an existing one.
      const existing = await tx.get(teacherRef);
      if (existing.exists()) {
        throw new Error(
          "Employee number collision - the teacher counter is out of sync."
        );
      }

      tx.set(teacherRef, {
        employeeNumber,
        ...request,
        status: "active",
        createdByUid: actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tx.set(counterRef, { current: next }, { merge: true });

      return { employeeNumber };
    });
  }
}
