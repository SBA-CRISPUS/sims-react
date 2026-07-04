export type SubscriptionPlan =
  | "Basic"
  | "Professional"
  | "Enterprise";

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