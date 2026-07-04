export type UserRole =
  | "super_admin"
  | "school_admin"
  | "head_teacher"
  | "deputy_head"
  | "hod"
  | "teacher"
  | "student"
  | "parent";

export interface User {
  uid: string;

  schoolId?: string;

  displayName: string;

  email: string;

  role: UserRole;

  active: boolean;

  createdAt: Date;

  updatedAt: Date;
}