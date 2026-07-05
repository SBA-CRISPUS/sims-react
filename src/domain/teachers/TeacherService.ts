import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../firebase";

import type { Teacher } from "./Teacher";

/** The teacher fields a teacher-admin may edit after registration. */
export type TeacherPatch = Partial<
  Pick<
    Teacher,
    | "title"
    | "firstName"
    | "lastName"
    | "gender"
    | "phone"
    | "email"
    | "departmentId"
    | "employmentType"
    | "qualification"
    | "tscNumber"
    | "status"
  >
>;

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === "function" ? maybe.toDate() : undefined;
}

function mapTeacher(data: Record<string, unknown>): Teacher {
  return {
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as unknown as Teacher;
}

export class TeacherService {
  static async listTeachers(schoolCode: string): Promise<Teacher[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "teachers")
    );
    return snapshot.docs
      .map((d) => mapTeacher(d.data()))
      .sort((a, b) => a.employeeNumber.localeCompare(b.employeeNumber));
  }

  static async getTeacher(
    schoolCode: string,
    employeeNumber: string
  ): Promise<Teacher | null> {
    const snapshot = await getDoc(
      doc(db, "schools", schoolCode, "teachers", employeeNumber)
    );
    return snapshot.exists() ? mapTeacher(snapshot.data()) : null;
  }

  /** Corrects/updates a teacher's HR details. The security rules keep
   * linkedUserUid CF-only, so it can't be touched here. */
  static async updateTeacher(
    schoolCode: string,
    employeeNumber: string,
    patch: TeacherPatch
  ): Promise<void> {
    await updateDoc(doc(db, "schools", schoolCode, "teachers", employeeNumber), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  }
}
