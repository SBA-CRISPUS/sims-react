import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../../firebase";

import { normaliseSchool } from "../subscription";
import type {
  School,
  SchoolFeatures,
  SchoolPolicies,
  SubscriptionLedgerEntry,
} from "../types";

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

    return normaliseSchool(snapshot.data() as School);
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
      .map((d) => normaliseSchool({ ...(d.data() as School), id: d.id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** ENTITLEMENT writes (subscription tier / status): frozen for school
   * admins by the rules, so only a super_admin call succeeds. Suspending
   * a school locks its users out via the SuspensionGate. */
  static async updateEntitlements(
    schoolCode: string,
    patch: Partial<
      Pick<
        School,
        "subscription" | "status" | "subscriptionExpiresAt" | "ownership"
      >
    >
  ): Promise<void> {
    await updateDoc(doc(db, "schools", schoolCode), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  }

  /** Platform billing history for one school, newest first. */
  static async listSubscriptionLedger(
    schoolCode: string
  ): Promise<SubscriptionLedgerEntry[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "subscriptionLedger")
    );
    return snapshot.docs
      .map(
        (d) =>
          ({ ...d.data(), entryId: d.id }) as SubscriptionLedgerEntry
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /** Append a billing entry (super_admin only; ledger is append-only -
   * corrections are new negative entries, never edits). */
  static async addSubscriptionEntry(
    schoolCode: string,
    entry: Omit<SubscriptionLedgerEntry, "entryId" | "recordedByUid" | "recordedAt">,
    actorUid: string
  ): Promise<void> {
    if (!entry.amount || !Number.isFinite(entry.amount))
      throw new Error("Enter a non-zero amount.");
    await addDoc(collection(db, "schools", schoolCode, "subscriptionLedger"), {
      ...entry,
      note: entry.note ?? "",
      recordedByUid: actorUid,
      recordedAt: serverTimestamp(),
    });
  }

  /** Flip a governance policy switch (free, unlike features). Frozen for
   * school admins by the rules - a School Administrator cannot grant
   * themselves academic authority; the platform flips it on the school's
   * (Head Teacher's) request. */
  static async setPolicy(
    schoolCode: string,
    policy: keyof SchoolPolicies,
    enabled: boolean
  ): Promise<void> {
    await updateDoc(doc(db, "schools", schoolCode), {
      [`policies.${policy}`]: enabled,
      updatedAt: serverTimestamp(),
    });
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
