import type { NavigationItem } from "../types/navigation";

export const navigation: NavigationItem[] = [
  {
    title: "Dashboard",
    path: "/",
    roles: [
      "super_admin",
      "school_admin",
      "head_teacher",
      "deputy_head",
      "hod",
      "teacher",
      "student",
      "parent",
    ],
  },

  {
    title: "Schools",
    path: "/schools",
    group: "Administration",
    roles: ["super_admin"],
  },
  {
  title: "Register School",
  path: "/schools/new",
  roles: ["super_admin"],
  },

  {
    title: "Students",
    path: "/students",
    roles: [
      "school_admin",
      "head_teacher",
      "teacher",
    ],
  },

  {
    title: "Teachers",
    path: "/teachers",
    roles: [
      "school_admin",
      "head_teacher",
    ],
  },

  {
    title: "Subjects",
    path: "/subjects",
    roles: [
      "school_admin",
      "teacher",
    ],
  },

  {
    title: "Reports",
    path: "/reports",
    roles: [
      "school_admin",
      "teacher",
      "head_teacher",
    ],
  },
];