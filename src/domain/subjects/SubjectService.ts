import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../firebase";

import type { Subject, SubjectInput } from "./Subject";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === "function" ? maybe.toDate() : undefined;
}

export class SubjectService {
  static async listSubjects(schoolCode: string): Promise<Subject[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "subjects")
    );
    return snapshot.docs
      .map(
        (d) =>
          ({
            ...d.data(),
            createdAt: toDate(d.data().createdAt),
            updatedAt: toDate(d.data().updatedAt),
          }) as Subject
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  static async createSubject(
    schoolCode: string,
    input: SubjectInput
  ): Promise<void> {
    const code = input.subjectCode.trim().toUpperCase();
    const ref = doc(db, "schools", schoolCode, "subjects", code);

    await runTransaction(db, async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists()) {
        throw new Error(`Subject ${code} already exists.`);
      }
      tx.set(ref, {
        subjectCode: code,
        name: input.name.trim(),
        departmentId: input.departmentId,
        formsOffered: input.formsOffered,
        sbaEnabled: input.sbaEnabled,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  static async updateSubject(
    schoolCode: string,
    subjectCode: string,
    patch: Partial<
      Pick<Subject, "name" | "departmentId" | "formsOffered" | "sbaEnabled" | "active">
    >
  ): Promise<void> {
    await updateDoc(doc(db, "schools", schoolCode, "subjects", subjectCode), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  }
}
