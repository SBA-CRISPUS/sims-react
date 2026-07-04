export type GuardianRelationship =
  | "Father"
  | "Mother"
  | "Guardian"
  | "Grandparent"
  | "Other";

/**
 * A guardian is stored once and linked to one or more students - never
 * duplicated inside each student document.
 */
export interface Guardian {
  guardianId: string;
  firstName: string;
  lastName: string;
  relationship: GuardianRelationship;
  phone: string;
  alternativePhone?: string;
  email?: string;
  address?: string;
}
