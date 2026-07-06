import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../../firebase";
import { mapEnrollment } from "./mappers";

/**
 * Assigns a class (stream) to a student's current enrollment. This is the
 * receiving school's follow-up to a cross-school transfer: the import CF
 * deliberately leaves streamId blank so the school decides the class.
 *
 * Writes the stream CODE (e.g. "A") onto the enrollment - the same shape
 * admissions write - and onEnrollmentWritten then recounts the stream's
 * occupiedCount server-side, so no counter is touched here.
 */
export class StudentPlacementService {
  static async placeStudent(
    schoolCode: string,
    studentNumber: string,
    streamCode: string
  ): Promise<void> {
    const code = streamCode.trim().toUpperCase();
    if (!code) throw new Error("Pick a stream.");

    const snapshot = await getDocs(
      query(
        collection(db, "schools", schoolCode, "enrollments"),
        where("studentId", "==", studentNumber)
      )
    );
    // Newest active enrollment = the current one (same rule the registry
    // uses to derive a student's current enrollment).
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

    // Placement is how a learner joins rosters and occupancy tracking, so
    // the stream must really exist for the enrollment's level - no
    // free-text here (admission's fallback covers stream-less schools).
    const level = current.enrollment.academicLevelCode;
    const streamSnap = await getDoc(
      doc(db, "schools", schoolCode, "streams", `${level}-${code}`)
    );
    if (!streamSnap.exists() || streamSnap.data().active === false) {
      throw new Error(
        `No active stream ${code} for ${level}. Create it under Academic Structure first.`
      );
    }

    await updateDoc(current.ref, {
      streamId: code,
      updatedAt: serverTimestamp(),
    });
  }
}
