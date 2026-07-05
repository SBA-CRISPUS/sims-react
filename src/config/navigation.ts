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
    group: "Academics",
    roles: [
      "school_admin",
      "head_teacher",
      "teacher",
    ],
  },
  {
    title: "Student Registry",
    path: "/students/registry",
    group: "Academics",
    roles: [
      "school_admin",
      "head_teacher",
      "teacher",
    ],
  },
  {
    title: "Academic Structure",
    path: "/academic/structure",
    group: "Academics",
    roles: [
      "school_admin",
      "head_teacher",
      "teacher",
    ],
  },

  {
    title: "Teachers",
    path: "/teachers",
    group: "Academics",
    roles: [
      "school_admin",
      "head_teacher",
    ],
  },

  {
    title: "Subjects",
    path: "/subjects",
    group: "Academics",
    roles: [
      "school_admin",
      "head_teacher",
      "teacher",
    ],
  },

  {
    title: "Teaching",
    path: "/teaching",
    group: "Academics",
    roles: [
      "school_admin",
      "head_teacher",
    ],
  },

  {
    title: "SBA Plans",
    path: "/assessments/plans",
    group: "Academics",
    roles: [
      "school_admin",
      "head_teacher",
      "hod",
    ],
  },

  {
    title: "SBA Marks",
    path: "/assessments/marks",
    group: "Academics",
    roles: [
      "school_admin",
      "head_teacher",
      "hod",
      "teacher",
    ],
  },

  {
    title: "SBA Review",
    path: "/assessments/review",
    group: "Academics",
    roles: [
      "school_admin",
      "head_teacher",
      "deputy_head",
      "hod",
    ],
  },

  {
    title: "SBA Readiness",
    path: "/assessments/readiness",
    group: "Academics",
    roles: [
      "school_admin",
      "head_teacher",
      "deputy_head",
      "hod",
    ],
  },

  {
    title: "ECZ Export",
    path: "/assessments/export",
    group: "Academics",
    roles: [
      "school_admin",
      "head_teacher",
      "deputy_head",
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

  {
    title: "SBA Demo Data",
    path: "/dev/seed",
    group: "Administration",
    roles: ["school_admin"],
  },
];