import type { NavigationItem } from "../types/navigation";

// Order matters: the sidebar renders items in this order and emits a
// section heading whenever `group` changes. Ungrouped items sit at the
// top (the everyday landing pages), then Academics, Assessments (the
// SBA workflow in pipeline order), and Administration.
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
    title: "My Tasks",
    path: "/tasks",
    roles: [
      "school_admin",
      "head_teacher",
      "deputy_head",
      "hod",
      "teacher",
    ],
  },

  {
    title: "My Classes",
    path: "/my-classes",
    roles: [
      "teacher",
      "hod",
      "head_teacher",
      "deputy_head",
    ],
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
    title: "Promotion",
    path: "/students/promotion",
    group: "Academics",
    roles: [
      "school_admin",
      "head_teacher",
    ],
  },
  {
    // Teachers get their academic context (year/term/streams) from the
    // header bar and My Classes - the full structure page is for the
    // people who manage it (mentor's least-privilege refinement).
    title: "Academic Structure",
    path: "/academic/structure",
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
    title: "Teachers",
    path: "/teachers",
    group: "Academics",
    roles: [
      "school_admin",
      "head_teacher",
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
    title: "Transfers",
    path: "/transfers",
    group: "Academics",
    roles: [
      "school_admin",
      "head_teacher",
      "deputy_head",
    ],
  },

  {
    title: "SBA Plans",
    path: "/assessments/plans",
    group: "Assessments",
    roles: [
      "school_admin",
      "head_teacher",
      "hod",
    ],
  },
  {
    title: "SBA Marks",
    path: "/assessments/marks",
    group: "Assessments",
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
    group: "Assessments",
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
    group: "Assessments",
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
    group: "Assessments",
    roles: [
      "school_admin",
      "head_teacher",
      "deputy_head",
    ],
  },
  {
    title: "Continuous Assessment",
    path: "/assessments/continuous",
    group: "Assessments",
    roles: [
      "school_admin",
      "head_teacher",
      "deputy_head",
      "hod",
      "teacher",
    ],
  },

  {
    title: "Reports",
    path: "/reports",
    group: "Administration",
    roles: [
      "school_admin",
      "head_teacher",
      "deputy_head",
      "hod",
    ],
  },
  {
    title: "School Profile",
    path: "/school",
    group: "Administration",
    roles: ["school_admin"],
  },
  {
    title: "Staff Accounts",
    path: "/staff",
    group: "Administration",
    roles: ["school_admin"],
  },
  {
    title: "Payments",
    path: "/finance/payments",
    group: "Administration",
    roles: ["school_admin", "head_teacher"],
    hideForGovernment: true,
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
    group: "Administration",
    roles: ["super_admin"],
  },
];
