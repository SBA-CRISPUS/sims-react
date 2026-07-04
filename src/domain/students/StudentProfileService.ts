import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../firebase";

import { mapStudent, mapEnrollment, mapAuditEntry } from "./mappers";
import type { Student } from "./Student";
import type { Enrollment } from "./Enrollment";
import type { AuditLogEntry } from "./AuditLogEntry";

/**
 * Loads one learner's file, tab by tab. Each method backs an
 * independently-loaded profile tab - no single monolithic read.
 */
export class StudentProfileService {
  static async getStudent(
    schoolCode: string,
    studentNumber: string
  ): Promise<Student | null> {
    const snapshot = await getDoc(
      doc(db, "schools", schoolCode, "students", studentNumber)
    );
    return snapshot.exists() ? mapStudent(snapshot.data()) : null;
  }

  static async listStudentEnrollments(
    schoolCode: string,
    studentNumber: string
  ): Promise<Enrollment[]> {
    const snapshot = await getDocs(
      query(
        collection(db, "schools", schoolCode, "enrollments"),
        where("studentId", "==", studentNumber)
      )
    );
    return snapshot.docs.map((d) => mapEnrollment(d.data()));
  }

  static async listStudentAudit(
    schoolCode: string,
    studentNumber: string
  ): Promise<AuditLogEntry[]> {
    // No orderBy: combining where(studentNumber) with orderBy(at) needs
    // a composite index. Sort client-side instead.
    const snapshot = await getDocs(
      query(
        collection(db, "schools", schoolCode, "auditLogs"),
        where("studentNumber", "==", studentNumber)
      )
    );
    return snapshot.docs
      .map((d) => mapAuditEntry(d.id, d.data()))
      .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
  }
}
