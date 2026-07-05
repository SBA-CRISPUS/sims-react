import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase";
import { mapStudent, mapEnrollment } from "../students/mappers";
import type { Student } from "../students/Student";

import { sbaMarkId } from "./SbaMark";
import { sbaSubmissionId } from "./SbaSubmission";
import type { SbaMark } from "./SbaMark";
import type { SbaSubmissionMeta } from "./SbaSubmission";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === "function" ? maybe.toDate() : undefined;
}

/** One row the teacher edits; `exists` decides create vs update on save. */
export interface MarkDraft {
  studentId: string;
  examinationNumber?: string;
  taskScores: Record<string, number>;
  notTaking: boolean;
  exists: boolean;
}

export class SbaMarkService {
  /**
   * The learners to score for a class: those enrolled in the stream this
   * year. Query is a single equality on streamId (no composite index);
   * the year/status filter is applied in memory. Returns the full Student
   * so the grid has names + examination numbers.
   */
  static async listRoster(
    schoolCode: string,
    academicYearId: string,
    streamId: string
  ): Promise<Student[]> {
    const enrollSnap = await getDocs(
      query(
        collection(db, "schools", schoolCode, "enrollments"),
        where("streamId", "==", streamId)
      )
    );

    const ids = new Set(
      enrollSnap.docs
        .map((d) => mapEnrollment(d.data()))
        .filter(
          (e) => e.academicYearId === academicYearId && e.status === "active"
        )
        .map((e) => e.studentId)
    );
    if (ids.size === 0) return [];

    const studentsSnap = await getDocs(
      collection(db, "schools", schoolCode, "students")
    );
    return studentsSnap.docs
      .map((d) => mapStudent(d.data()))
      .filter((s) => ids.has(s.studentNumber))
      .sort((a, b) => a.studentNumber.localeCompare(b.studentNumber));
  }

  static async listMarks(
    schoolCode: string,
    submissionId: string
  ): Promise<SbaMark[]> {
    const snapshot = await getDocs(
      query(
        collection(db, "schools", schoolCode, "sbaMarks"),
        where("submissionId", "==", submissionId)
      )
    );
    return snapshot.docs.map(
      (d) =>
        ({
          ...d.data(),
          createdAt: toDate(d.data().createdAt),
          updatedAt: toDate(d.data().updatedAt),
        }) as SbaMark
    );
  }

  /** One learner's marks across every subject/form-year (single-field
   * query on studentId - no composite index). */
  static async listLearnerMarks(
    schoolCode: string,
    studentNumber: string
  ): Promise<SbaMark[]> {
    const snapshot = await getDocs(
      query(
        collection(db, "schools", schoolCode, "sbaMarks"),
        where("studentId", "==", studentNumber)
      )
    );
    return snapshot.docs.map(
      (d) =>
        ({
          ...d.data(),
          createdAt: toDate(d.data().createdAt),
          updatedAt: toDate(d.data().updatedAt),
        }) as SbaMark
    );
  }

  /** Every mark for a subject across its streams (single-field query on
   * subjectId; the year/form filter is applied in memory). Backs the ECZ
   * export. */
  static async listSubjectMarks(
    schoolCode: string,
    subjectId: string
  ): Promise<SbaMark[]> {
    const snapshot = await getDocs(
      query(
        collection(db, "schools", schoolCode, "sbaMarks"),
        where("subjectId", "==", subjectId)
      )
    );
    return snapshot.docs.map(
      (d) =>
        ({
          ...d.data(),
          createdAt: toDate(d.data().createdAt),
          updatedAt: toDate(d.data().updatedAt),
        }) as SbaMark
    );
  }

  /**
   * Upserts the given rows as a single batch. New rows are created (with
   * origin metadata) at status "draft"; existing rows are updated in place
   * WITHOUT touching createdAt/createdByUid (the rule freezes those). Uses
   * deterministic-id set()/update() - no counter, no transaction - so
   * classroom scoring works offline and syncs on reconnect.
   *
   * obtainedTotal/rawScore are never written here: they are frozen only by
   * the approval Cloud Function (5C).
   */
  static async saveMarks(
    schoolCode: string,
    actorUid: string,
    meta: SbaSubmissionMeta,
    rows: MarkDraft[]
  ): Promise<void> {
    if (rows.length === 0) return;
    const subId = sbaSubmissionId(meta);
    const batch = writeBatch(db);

    for (const row of rows) {
      const id = sbaMarkId({
        academicYearId: meta.academicYearId,
        streamId: meta.streamId,
        subjectId: meta.subjectId,
        studentId: row.studentId,
      });
      const ref = doc(db, "schools", schoolCode, "sbaMarks", id);

      if (row.exists) {
        batch.update(ref, {
          taskScores: row.taskScores,
          notTaking: row.notTaking,
          ...(row.examinationNumber
            ? { examinationNumber: row.examinationNumber }
            : {}),
          status: "draft",
          lastActionByUid: actorUid,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(ref, {
          id,
          submissionId: subId,
          planId: meta.planId,
          academicYearId: meta.academicYearId,
          academicLevelCode: meta.academicLevelCode,
          streamId: meta.streamId,
          subjectId: meta.subjectId,
          studentId: row.studentId,
          ...(row.examinationNumber
            ? { examinationNumber: row.examinationNumber }
            : {}),
          taskScores: row.taskScores,
          notTaking: row.notTaking,
          status: "draft",
          lastActionByUid: actorUid,
          createdByUid: actorUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  }
}
