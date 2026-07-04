import { collection, getDocs } from "firebase/firestore";

import { db } from "../../firebase";

import type { AcademicLevel } from "./AcademicLevel";
import type { AcademicYear, Term } from "./AcademicYear";

/**
 * Read access to the provisioned academic hierarchy (years, terms,
 * levels). Streams have their own StreamService.
 */
export class AcademicStructureService {
  static async listYears(schoolCode: string): Promise<AcademicYear[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "academicYears")
    );
    return snapshot.docs
      .map((d) => d.data() as AcademicYear)
      .sort((a, b) => b.year - a.year);
  }

  static async listTerms(
    schoolCode: string,
    academicYearId: string
  ): Promise<Term[]> {
    const snapshot = await getDocs(
      collection(
        db,
        "schools",
        schoolCode,
        "academicYears",
        academicYearId,
        "terms"
      )
    );
    return snapshot.docs
      .map((d) => d.data() as Term)
      .sort((a, b) => a.order - b.order);
  }

  static async listLevels(schoolCode: string): Promise<AcademicLevel[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "academicLevels")
    );
    return snapshot.docs
      .map((d) => d.data() as AcademicLevel)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
}
