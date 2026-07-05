import type { StudentStatus } from "./StudentStatus";

/**
 * Zambian CBC context, carried from day one so future Ministry of
 * Education reporting needs no schema change.
 */
export interface StudentCbc {
  pathway?: string;
  specialNeeds?: boolean;
  boarding?: boolean;
  transport?: boolean;
}

/**
 * The core student document. Stays deliberately stable - anything that
 * changes year to year (stream, level, academic year) lives on the
 * Enrollment, not here.
 */
export interface Student {
  studentNumber: string;
  /** Permanent SIMS learner id (SL-YYYY-NNNNNNNNN), assigned by the
   * onStudentAdmitted Cloud Function and unchanged for life - it follows
   * the learner across schools (Phase 8). */
  learnerId?: string;
  admissionNumber: string;
  emisNumber?: string;
  examinationNumber?: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  gender: "Male" | "Female";
  dateOfBirth: Date;
  nationality: string;
  status: StudentStatus;
  // Service-generated on admission.
  admissionId: string;
  guardianIds: string[];
  admittedByUid: string;
  cbc?: StudentCbc;
  createdAt: Date;
  updatedAt: Date;
}
