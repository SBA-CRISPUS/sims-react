import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase";
import { mapStudent } from "./mappers";
import type { Student } from "./Student";

/**
 * Assigns ECZ examination numbers to learners - the key every SBA mark is
 * submitted under. Read + batch update; no new counter (the number comes
 * from ECZ, not from us).
 */
export class StudentExamNumberService {
  static async listStudents(schoolCode: string): Promise<Student[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "students")
    );
    return snapshot.docs.map((d) => mapStudent(d.data()));
  }

  static async setExamNumbers(
    schoolCode: string,
    rows: { studentNumber: string; examinationNumber: string }[]
  ): Promise<void> {
    if (rows.length === 0) return;
    const batch = writeBatch(db);
    for (const r of rows) {
      batch.update(doc(db, "schools", schoolCode, "students", r.studentNumber), {
        examinationNumber: r.examinationNumber.trim(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}
