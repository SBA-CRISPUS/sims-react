import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase";

/**
 * Year lifecycle beyond provisioning: schools create each following
 * academic year themselves (with its three terms), then explicitly
 * switch "current" when the new year actually starts. Creation is
 * school_admin-only (academic-structure rules).
 */
export class AcademicYearService {
  /** Creates AY-{year} (current: false) + Terms 1-3. Safe to call once
   * per year id - the fixed doc id means a re-run just overwrites the
   * same skeleton. */
  static async createYear(schoolCode: string, year: number): Promise<string> {
    const academicYearId = `AY-${year}`;
    const batch = writeBatch(db);

    batch.set(
      doc(db, "schools", schoolCode, "academicYears", academicYearId),
      {
        academicYearId,
        name: `${year} Academic Year`,
        year,
        current: false,
        status: "active",
        terms: 3,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    for (let i = 1; i <= 3; i++) {
      batch.set(
        doc(
          collection(
            db,
            "schools",
            schoolCode,
            "academicYears",
            academicYearId,
            "terms"
          ),
          `TERM-${i}`
        ),
        {
          termId: `TERM-${i}`,
          name: `Term ${i}`,
          order: i,
          current: i === 1,
          locked: false,
          status: "active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
    }

    await batch.commit();
    return academicYearId;
  }

  /** Makes one year the school's current year: flips every year's
   * `current` flag and points school.currentAcademicYearId at it (the
   * default the transfer-import Cloud Function enrolls into). */
  static async setCurrentYear(
    schoolCode: string,
    targetYearId: string,
    allYearIds: string[]
  ): Promise<void> {
    const batch = writeBatch(db);
    for (const yearId of allYearIds) {
      batch.update(
        doc(db, "schools", schoolCode, "academicYears", yearId),
        { current: yearId === targetYearId, updatedAt: serverTimestamp() }
      );
    }
    batch.update(doc(db, "schools", schoolCode), {
      currentAcademicYearId: targetYearId,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  }
}
