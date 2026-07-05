import type { TeacherStatus } from "./TeacherStatus";

/**
 * A staff member. The profile stays stable; year-to-year teaching
 * assignments live in a separate collection (Sprint 5 Part 2), never
 * on the teacher document.
 *
 * A teacher record is HR data - it is NOT a login account. Teachers who
 * need to sign in (e.g. for SBA marks entry) get a users/{uid} account
 * provisioned server-side later, linked by employeeNumber.
 */
export interface Teacher {
  employeeNumber: string;
  title?: string;
  firstName: string;
  lastName: string;
  gender: "Male" | "Female";
  phone: string;
  email: string;
  departmentId: string | null;
  employmentType: string;
  qualification?: string;
  tscNumber?: string;
  status: TeacherStatus;
  /** The Firebase Auth uid of the teacher's login account, set only by the
   * createTeacherAccount Cloud Function once provisioned (null until then). */
  linkedUserUid?: string | null;
  createdByUid: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TeacherRegistrationRequest {
  title: string;
  firstName: string;
  lastName: string;
  gender: "Male" | "Female";
  phone: string;
  email: string;
  departmentId: string | null;
  employmentType: string;
  qualification: string;
  tscNumber: string;
}
