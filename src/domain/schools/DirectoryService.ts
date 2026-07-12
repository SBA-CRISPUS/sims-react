import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase";

/** One school's public entry: enough to confirm "yes, that code is the
 * school I mean" before sending a transfer. */
export interface DirectoryEntry {
  schoolCode: string;
  name: string;
  district: string;
  province: string;
  active: boolean;
}

/**
 * The signed-in-readable school directory (/directory), kept in sync by
 * the onSchoolWritten Cloud Function. Read here by the transfer form;
 * the super admin can backfill it for schools created before the CF
 * existed.
 */
export class DirectoryService {
  static async getEntry(schoolCode: string): Promise<DirectoryEntry | null> {
    const snapshot = await getDoc(doc(db, "directory", schoolCode));
    return snapshot.exists() ? (snapshot.data() as DirectoryEntry) : null;
  }

  /** Super-admin backfill: mirrors every school into the directory in
   * one batch (the CF keeps them fresh from then on). */
  static async syncAll(
    schools: {
      schoolCode: string;
      name: string;
      status: string;
      location?: { district?: string; province?: string };
    }[]
  ): Promise<number> {
    const batch = writeBatch(db);
    for (const s of schools) {
      // Defensive: a document without a code cannot be mirrored (and
      // an undefined path segment crashes Firestore's path parser).
      if (!s.schoolCode) continue;
      batch.set(doc(db, "directory", s.schoolCode), {
        schoolCode: s.schoolCode,
        name: s.name,
        district: s.location?.district ?? "",
        province: s.location?.province ?? "",
        active: s.status === "active",
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return schools.length;
  }
}
