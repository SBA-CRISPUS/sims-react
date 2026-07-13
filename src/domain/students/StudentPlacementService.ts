import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentReference,
} from "firebase/firestore";

import { db } from "../../firebase";
import { mapEnrollment } from "./mappers";

/**
 * Assigns / reassigns a student's class (level + stream) on their current
 * enrollment. Placement is the receiving school's follow-up to a transfer
 * (the import CF leaves streamId blank), and reassignment corrects a wrong
 * placement.
 *
 * Writes the stream CODE (e.g. "A") onto the enrollment - the same shape
 * admissions write - and onEnrollmentWritten then recounts occupiedCount
 * server-side for BOTH the old and new stream (the recount key embeds the
 * level, so a level change is reconciled too), so no counter is touched here.
 */
export class StudentPlacementService {
  /** Newest active enrollment = the current one (same rule the registry
   * uses to derive a student's current enrollment). */
  private static async currentEnrollmentRef(
    schoolCode: string,
    studentNumber: string
  ): Promise<{ ref: DocumentReference; academicLevelCode: string }> {
    const snapshot = await getDocs(
      query(
        collection(db, "schools", schoolCode, "enrollments"),
        where("studentId", "==", studentNumber)
      )
    );
    const current = snapshot.docs
      .map((d) => ({ ref: d.ref, enrollment: mapEnrollment(d.data()) }))
      .filter((e) => e.enrollment.status === "active")
      .sort(
        (a, b) =>
          (b.enrollment.admissionDate?.getTime() ?? 0) -
          (a.enrollment.admissionDate?.getTime() ?? 0)
      )[0];
    if (!current) {
      throw new Error("This student has no active enrollment to place.");
    }
    return {
      ref: current.ref,
      academicLevelCode: current.enrollment.academicLevelCode,
    };
  }

  /** The stream must really exist and be active for the level, so placement
   * always joins a real roster (no free-text here). */
  private static async assertStreamExists(
    schoolCode: string,
    level: string,
    code: string
  ): Promise<void> {
    const streamSnap = await getDoc(
      doc(db, "schools", schoolCode, "streams", `${level}-${code}`)
    );
    if (!streamSnap.exists() || streamSnap.data().active === false) {
      throw new Error(
        `No active stream ${code} for ${level}. Create it under Academic Structure first.`
      );
    }
  }

  /** Assign a stream within the student's current level (transfer follow-up). */
  static async placeStudent(
    schoolCode: string,
    studentNumber: string,
    streamCode: string
  ): Promise<void> {
    const code = streamCode.trim().toUpperCase();
    if (!code) throw new Error("Pick a stream.");

    const current = await this.currentEnrollmentRef(schoolCode, studentNumber);
    await this.assertStreamExists(schoolCode, current.academicLevelCode, code);

    await updateDoc(current.ref, {
      streamId: code,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Correct a wrong placement: move the current enrollment to a different
   * level and/or stream (e.g. a learner entered as Form 1 who is really
   * Form 2). Same academic year - this is a fix, not a promotion.
   */
  static async changePlacement(
    schoolCode: string,
    studentNumber: string,
    levelCode: string,
    streamCode: string
  ): Promise<void> {
    const level = levelCode.trim();
    const code = streamCode.trim().toUpperCase();
    if (!level) throw new Error("Pick a form.");
    if (!code) throw new Error("Pick a stream.");

    const current = await this.currentEnrollmentRef(schoolCode, studentNumber);
    await this.assertStreamExists(schoolCode, level, code);

    await updateDoc(current.ref, {
      academicLevelCode: level,
      streamId: code,
      updatedAt: serverTimestamp(),
    });
  }
}
