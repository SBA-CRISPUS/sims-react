import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "../../../firebase";

import type { School } from "../types";

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
}
