export type UserRole =
  | "super_admin"
  | "school_admin"
  | "head_teacher"
  | "deputy_head"
  | "hod"
  | "teacher"
  | "student"
  | "parent";

export interface UserProfile {
  uid: string;
  schoolCode: string;
  displayName: string;
  email: string;
  role: UserRole;
  employeeNumber?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
