import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase";

export type PromotionAction = "promote" | "repeat" | "graduate" | "skip";

/** One student's reviewed plan for the year change. */
export interface PromotionRow {
  studentNumber: string;
  action: PromotionAction;
  /** Target form for promote/repeat (already resolved by the page). */
  toLevel?: string;
  /** Stream CODE at the target form ("" = arrives unplaced). */
  toStream?: string;
}

export interface PromotionResult {
  enrolled: number;
  graduated: number;
  skipped: number;
}

/**
 * Applies the year change (docs/PROMOTION_DESIGN.md): batched NEW
 * enrollments in the target year for promote/repeat, a status flip to
 * "graduated" for F4 leavers, nothing for skip. Never touches the old
 * year's enrollments and never mints numbers - identity is permanent.
 */
export class PromotionService {
  /** Students already enrolled in the target year - the idempotency
   * set: re-runs mark them "already enrolled" instead of duplicating. */
  static async listEnrolledStudentIds(
    schoolCode: string,
    academicYearId: string
  ): Promise<Set<string>> {
    const snapshot = await getDocs(
      query(
        collection(db, "schools", schoolCode, "enrollments"),
        where("academicYearId", "==", academicYearId)
      )
    );
    return new Set(snapshot.docs.map((d) => d.data().studentId as string));
  }

  static async apply(
    schoolCode: string,
    targetYearId: string,
    rows: PromotionRow[],
    onProgress?: (done: number, total: number) => void
  ): Promise<PromotionResult> {
    const result: PromotionResult = { enrolled: 0, graduated: 0, skipped: 0 };
    const actionable = rows.filter((r) => r.action !== "skip");
    result.skipped = rows.length - actionable.length;

    // Firestore batches cap at 500 writes; stay comfortably below.
    const CHUNK = 300;
    for (let i = 0; i < actionable.length; i += CHUNK) {
      const batch = writeBatch(db);
      for (const row of actionable.slice(i, i + CHUNK)) {
        if (row.action === "graduate") {
          batch.update(
            doc(db, "schools", schoolCode, "students", row.studentNumber),
            { status: "graduated", updatedAt: serverTimestamp() }
          );
          result.graduated++;
        } else {
          batch.set(
            doc(collection(db, "schools", schoolCode, "enrollments")),
            {
              studentId: row.studentNumber,
              academicYearId: targetYearId,
              academicLevelCode: row.toLevel ?? "",
              streamId: row.toStream ?? "",
              admissionDate: new Date(),
              status: "active",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }
          );
          result.enrolled++;
        }
      }
      await batch.commit();
      onProgress?.(Math.min(i + CHUNK, actionable.length), actionable.length);
    }

    return result;
  }
}
