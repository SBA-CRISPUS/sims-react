import type { UserRole } from "../features/auth/types/UserProfile";

export interface NavigationItem {
  title: string;
  path: string;

  // NEW
  group?: string;

  roles: UserRole[];

  /** Hidden for Government schools (fee-free by law) - e.g. Payments. */
  hideForGovernment?: boolean;
}
