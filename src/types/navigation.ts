import type { UserRole } from "./user";

export interface NavigationItem {
  title: string;
  path: string;

  // NEW
  group?: string;

  roles: UserRole[];
}
