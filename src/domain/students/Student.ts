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
  cbc?: StudentCbc;
  createdAt: Date;
  updatedAt: Date;
}
