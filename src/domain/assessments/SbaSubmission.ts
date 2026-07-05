/**
 * The workflow unit for SBA marks: one class's subject sheet for a
 * form-year = (academic year, stream, subject). This is the thing a
 * subject teacher submits and (in 5C) a Head Teacher approves and signs.
 *
 * Stored at schools/{code}/sbaSubmissions keyed by the deterministic slot
 * id `{academicYearId}_{streamId}_{subjectId}` - the teaching slot minus
 * the term, because SBA is scored per form-year, not per term.
 */
export interface SbaClassSubmission {
  submissionId: string;
  planId: string; // {academicYearId}_{academicLevelCode}_{subjectId}
  academicYearId: string;
  academicLevelCode: string;
  streamId: string;
  subjectId: string;
  teacherId?: string | null; // denormalized from the teaching assignment (MVP: may be null)
  status: SbaSubmissionStatus;
  submittedByUid?: string;
  moderatedByUid?: string; // 5C
  approvedByUid?: string; // 5C
  lastActionByUid: string; // read by the audit CF (triggers have no auth context)
  frozenAt?: Date; // set when totals are frozen at approval (5C)
  createdByUid: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * draft -> submitted -> moderated -> approved -> locked, with a
 * `returned` bounce-back. Sprint 5B exercises draft/submitted (+ a manager
 * reopening a submitted sheet back to draft); moderated/approved/locked
 * land with the approval workflow in 5C.
 */
export type SbaSubmissionStatus =
  | "draft"
  | "submitted"
  | "returned"
  | "moderated"
  | "approved"
  | "locked";

/** Editable states: marks can be entered/changed only while open. */
export const SBA_OPEN_STATUSES: SbaSubmissionStatus[] = ["draft", "returned"];

export interface SbaSubmissionMeta {
  planId: string;
  academicYearId: string;
  academicLevelCode: string;
  streamId: string;
  subjectId: string;
  teacherId?: string | null;
}

export function sbaSubmissionId(input: {
  academicYearId: string;
  streamId: string;
  subjectId: string;
}): string {
  return `${input.academicYearId}_${input.streamId}_${input.subjectId}`;
}
