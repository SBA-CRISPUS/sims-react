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
  /** Set by the identity Cloud Functions on provisioning; cleared by the
   * user's own first successful password change. */
  mustChangePassword?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
