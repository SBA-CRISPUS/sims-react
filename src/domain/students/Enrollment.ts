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
  status: "active";
  createdAt: Date;
  updatedAt: Date;
}
