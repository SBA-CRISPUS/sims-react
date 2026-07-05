import type { SbaSubmissionStatus } from "./SbaSubmission";

/**
 * One learner's score-sheet row for a class's subject: the marks obtained
 * per task, keyed by taskId. Flat top-level collection
 * schools/{code}/sbaMarks (like enrollments) with denormalized equality
 * fields, keyed by the deterministic id
 * `{academicYearId}_{streamId}_{subjectId}_{studentId}` (one row per
 * learner per class, offline-friendly set(), rule-enforceable slot key).
 *
 * obtainedTotal/rawScore are FROZEN snapshots written only by the
 * approval Cloud Function in 5C (Admin SDK); the client never sets them.
 * The live working view computes the score from taskScores + the plan.
 */
export interface SbaMark {
  id: string;
  submissionId: string; // {academicYearId}_{streamId}_{subjectId}
  planId: string;
  academicYearId: string;
  academicLevelCode: string;
  streamId: string;
  subjectId: string;
  studentId: string;
  teacherId?: string | null; // owning teacher (from the teaching assignment); scoped write access
  examinationNumber?: string; // denormalized for the ECZ export (5D)
  taskScores: Record<string, number>; // { [taskId]: obtained }
  notTaking?: boolean; // elective/absent/exempt -> excluded from calc + export
  status: SbaSubmissionStatus; // mirrors the submission; gates editability + freeze
  obtainedTotal?: number; // frozen at approval (CF, 5C)
  rawScore?: number; // frozen /100 at approval (CF, 5C)
  lastActionByUid: string;
  createdByUid: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export function sbaMarkId(input: {
  academicYearId: string;
  streamId: string;
  subjectId: string;
  studentId: string;
}): string {
  return `${input.academicYearId}_${input.streamId}_${input.subjectId}_${input.studentId}`;
}
