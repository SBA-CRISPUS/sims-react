import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../../firebase";

import type { CaAssessment, CaAssessmentInput } from "./CaAssessment";

export class CaAssessmentService {
  /** All assessments for one class (stream), newest test first. Single
   * equality query (no composite index); the caller filters by year and
   * subject - CA volumes per stream stay small. */
  static async listForStream(
    schoolCode: string,
    streamId: string
  ): Promise<CaAssessment[]> {
    const snapshot = await getDocs(
      query(
        collection(db, "schools", schoolCode, "caAssessments"),
        where("streamId", "==", streamId)
      )
    );
    return snapshot.docs
      .map(
        (d) =>
          ({
            ...d.data(),
            assessmentId: d.id,
          }) as CaAssessment
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  static async create(
    schoolCode: string,
    input: CaAssessmentInput,
    actorUid: string
  ): Promise<void> {
    if (!input.name.trim()) throw new Error("Give the test a name.");
    if (!(input.maxMarks > 0)) throw new Error("Maximum marks must be above 0.");
    await addDoc(collection(db, "schools", schoolCode, "caAssessments"), {
      ...input,
      name: input.name.trim(),
      maxMarks: Math.round(input.maxMarks),
      scores: {},
      absent: [],
      createdByUid: actorUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  /** Replaces the score map + absent list (the grid saves whole-class). */
  static async saveScores(
    schoolCode: string,
    assessmentId: string,
    scores: Record<string, number>,
    absent: string[]
  ): Promise<void> {
    await updateDoc(
      doc(db, "schools", schoolCode, "caAssessments", assessmentId),
      { scores, absent, updatedAt: serverTimestamp() }
    );
  }

  static async remove(schoolCode: string, assessmentId: string): Promise<void> {
    await deleteDoc(
      doc(db, "schools", schoolCode, "caAssessments", assessmentId)
    );
  }
}
