export type SubscriptionPlan =
  | "Basic"
  | "Professional"
  | "Enterprise";

/** One band of the school's grading scale (inclusive bounds, raw /100). */
export interface GradingBand {
  min: number;
  max: number;
  label: string;
}

/** Sensible Zambian default; schools tune it on the School Profile page. */
export const DEFAULT_GRADING_SCALE: GradingBand[] = [
  { min: 0, max: 49, label: "Fail" },
  { min: 50, max: 59, label: "Pass" },
  { min: 60, max: 69, label: "Satisfactory" },
  { min: 70, max: 79, label: "Good" },
  { min: 80, max: 100, label: "Excellent" },
];

export function gradeFor(score: number, scale: GradingBand[]): string {
  return (
    scale.find((b) => score >= b.min && score <= b.max)?.label ?? "—"
  );
}

export type SchoolStatus =
  | "active"
  | "inactive"
  | "suspended";

export type ProvisioningStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

export interface School {

  id?: string;

  // Internal SIMS Code
  schoolCode: string;

  // Ministry EMIS Code
  emisCode: string;

  name: string;

  schoolType:
    | "Primary"
    | "Secondary"
    | "Combined"
    | "Technical";

  ownership:
    | "Government"
    | "Grant Aided"
    | "Private";

  location: {
    province: string;
    district: string;
    address: string;
  };

  contact: {
    phone: string;
    email: string;
  };

  // Descriptive profile fields maintained after setup (all optional).
  principal?: string;
  motto?: string;
  website?: string;
  postalAddress?: string;

  /** Download URL of the school's logo (Firebase Storage, uploaded on the
   * School Profile page). Shown in the header and on printed documents. */
  logoUrl?: string;

  /** The school's own grading scale, printed on report cards so parents
   * can read the scores. Falls back to DEFAULT_GRADING_SCALE. */
  gradingScale?: GradingBand[];

  subscription: SubscriptionPlan;

  status: SchoolStatus;

  provisioning: {
    status: ProvisioningStatus;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
  };

  currentAcademicYearId?: string;

  createdAt?: Date;

  updatedAt?: Date;
}

export const defaultSchool: School = {
  schoolCode: "",
  emisCode: "",
  name: "",

  schoolType: "Secondary",

  ownership: "Government",

  location: {
    province: "",
    district: "",
    address: "",
  },

  contact: {
    phone: "",
    email: "",
  },

  subscription: "Professional",

  status: "active",

  provisioning: {
    status: "pending",
  },
};