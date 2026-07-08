import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../../firebase";

import type { School, SchoolFeatures } from "../types";

/** The descriptive fields a school_admin may maintain after setup. The
 * security rules freeze schoolCode/emisCode/subscription/status/provisioning
 * for a school_admin, so those are never part of this patch. */
export type SchoolProfilePatch = Partial<
  Pick<
    School,
    | "name"
    | "schoolType"
    | "ownership"
    | "location"
    | "contact"
    | "principal"
    | "motto"
    | "website"
    | "postalAddress"
    | "logoUrl"
    | "gradingScale"
    | "examCentreNumber"
    | "sbaSubmissionDeadline"
  >
>;

export class SchoolService {
  static async getSchool(schoolCode: string): Promise<School | null> {
    const snapshot = await getDoc(doc(db, "schools", schoolCode));

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as School;
  }

  static async updateSchool(
    schoolCode: string,
    patch: SchoolProfilePatch
  ): Promise<void> {
    await updateDoc(doc(db, "schools", schoolCode), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  }

  /** All schools on the platform - super_admin only (rules deny others). */
  static async listSchools(): Promise<School[]> {
    const snapshot = await getDocs(collection(db, "schools"));
    return snapshot.docs
      .map((d) => ({ ...(d.data() as School), id: d.id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Flip a paid add-on for a school. ENTITLEMENT write: the rules freeze
   * the features map for school admins, so only a super_admin call
   * succeeds - the school itself cannot self-enable a billed feature. */
  static async setFeature(
    schoolCode: string,
    feature: keyof SchoolFeatures,
    enabled: boolean
  ): Promise<void> {
    await updateDoc(doc(db, "schools", schoolCode), {
      [`features.${feature}`]: enabled,
      updatedAt: serverTimestamp(),
    });
  }
}
