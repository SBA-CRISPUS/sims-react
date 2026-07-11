/**
 * A student's placement for one academic year. Kept separate from the
 * student so each year adds a new record instead of overwriting the
 * last - the enrollment history is the academic history.
 */
export interface Enrollment {
  studentId: string;
  academicYearId: string;
  academicLevelCode: string;
  streamId: string;
  admissionDate: Date;
  // "transferred" is set by onTransferAccepted when the learner moves to
  // another SIMS school; "withdrawn" by the withdrawal action (both keep
  // the record as history and drop the student from rosters).
  status: "active" | "transferred" | "withdrawn";
  createdAt: Date;
  updatedAt: Date;
}
