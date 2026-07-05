/**
 * "Who teaches what, to which class, during which term." The heart of
 * the academic engine - the SBA engine hangs off these records.
 *
 * A new set is created each academic year/term (no overwriting history
 * across years). Within a term, one (subject, stream) slot has one
 * teacher, enforced by the deterministic document id
 * `{academicYearId}_{termId}_{streamId}_{subjectId}`.
 */
export interface TeachingAssignment {
  id: string;
  teacherId: string;
  academicYearId: string;
  termId: string;
  subjectId: string;
  academicLevelCode: string;
  streamId: string;
  periodsPerWeek: number;
  classTeacher: boolean;
  active: boolean;
  createdByUid: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TeachingAssignmentInput {
  teacherId: string;
  academicYearId: string;
  termId: string;
  subjectId: string;
  academicLevelCode: string;
  streamId: string;
  periodsPerWeek: number;
  classTeacher: boolean;
}

export function assignmentId(input: {
  academicYearId: string;
  termId: string;
  streamId: string;
  subjectId: string;
}): string {
  return `${input.academicYearId}_${input.termId}_${input.streamId}_${input.subjectId}`;
}
