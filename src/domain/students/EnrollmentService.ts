import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "../../firebase";
import { mapEnrollment } from "./mappers";
import type { Enrollment } from "./Enrollment";

/**
 * Reads enrollments for one academic year in a single query (single-field
 * where on academicYearId, so no composite index). Backs class-roster
 * counts on the teacher's My Classes home.
 */
export class EnrollmentService {
  static async listActiveByYear(
    schoolCode: string,
    academicYearId: string
  ): Promise<Enrollment[]> {
    const snapshot = await getDocs(
      query(
        collection(db, "schools", schoolCode, "enrollments"),
        where("academicYearId", "==", academicYearId)
      )
    );
    return snapshot.docs
      .map((d) => mapEnrollment(d.data()))
      .filter((e) => e.status === "active");
  }
}
