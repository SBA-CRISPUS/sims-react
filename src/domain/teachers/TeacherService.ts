import { collection, doc, getDoc, getDocs } from "firebase/firestore";

import { db } from "../../firebase";

import type { Teacher } from "./Teacher";

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
}
