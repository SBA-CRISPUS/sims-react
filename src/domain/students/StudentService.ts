import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../firebase";

import type { Student } from "./Student";
import type { Enrollment } from "./Enrollment";
import type { AuditLogEntry } from "./AuditLogEntry";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === "function" ? maybe.toDate() : undefined;
}

function mapStudent(data: Record<string, unknown>): Student {
  return {
    ...data,
    dateOfBirth: toDate(data.dateOfBirth),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as unknown as Student;
}

function mapEnrollment(data: Record<string, unknown>): Enrollment {
  return {
    ...data,
    admissionDate: toDate(data.admissionDate),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as unknown as Enrollment;
}

export class StudentService {
  static async listStudents(schoolCode: string): Promise<Student[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "students")
    );
    return snapshot.docs.map((d) => mapStudent(d.data()));
  }

  static async getStudent(
    schoolCode: string,
    studentNumber: string
  ): Promise<Student | null> {
    const snapshot = await getDoc(
      doc(db, "schools", schoolCode, "students", studentNumber)
    );
    return snapshot.exists() ? mapStudent(snapshot.data()) : null;
  }

  static async listEnrollments(schoolCode: string): Promise<Enrollment[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "enrollments")
    );
    return snapshot.docs.map((d) => mapEnrollment(d.data()));
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
    // No orderBy here: combining where(studentNumber) with orderBy(at)
    // needs a composite index. Sort client-side instead.
    const snapshot = await getDocs(
      query(
        collection(db, "schools", schoolCode, "auditLogs"),
        where("studentNumber", "==", studentNumber)
      )
    );
    return snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          action: data.action,
          studentNumber: data.studentNumber,
          admissionId: data.admissionId,
          actorUid: data.actorUid,
          at: toDate(data.at),
        } as AuditLogEntry;
      })
      .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
  }
}
