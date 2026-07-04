import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../firebase";

import type { Guardian } from "./Guardian";
import type { Student } from "./Student";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === "function" ? maybe.toDate() : undefined;
}

export class GuardianService {
  static async getGuardian(
    schoolCode: string,
    guardianId: string
  ): Promise<Guardian | null> {
    const snapshot = await getDoc(
      doc(db, "schools", schoolCode, "guardians", guardianId)
    );
    return snapshot.exists() ? (snapshot.data() as Guardian) : null;
  }

  static async getGuardiansByIds(
    schoolCode: string,
    guardianIds: string[]
  ): Promise<Guardian[]> {
    const guardians = await Promise.all(
      guardianIds.map((id) => this.getGuardian(schoolCode, id))
    );
    return guardians.filter((g): g is Guardian => g !== null);
  }

  static async listGuardianChildren(
    schoolCode: string,
    guardianId: string
  ): Promise<Student[]> {
    const snapshot = await getDocs(
      query(
        collection(db, "schools", schoolCode, "students"),
        where("guardianIds", "array-contains", guardianId)
      )
    );
    return snapshot.docs.map(
      (d) =>
        ({
          ...d.data(),
          dateOfBirth: toDate(d.data().dateOfBirth),
          createdAt: toDate(d.data().createdAt),
          updatedAt: toDate(d.data().updatedAt),
        }) as unknown as Student
    );
  }
}
