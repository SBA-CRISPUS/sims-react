import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase";

import { sbaSubmissionId } from "./SbaSubmission";
import type {
  SbaClassSubmission,
  SbaSubmissionMeta,
  SbaSubmissionStatus,
} from "./SbaSubmission";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === "function" ? maybe.toDate() : undefined;
}

export class SbaSubmissionService {
  static async listSubmissions(
    schoolCode: string
  ): Promise<SbaClassSubmission[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "sbaSubmissions")
    );
    return snapshot.docs.map(
      (d) =>
        ({
          ...d.data(),
          createdAt: toDate(d.data().createdAt),
          updatedAt: toDate(d.data().updatedAt),
          frozenAt: toDate(d.data().frozenAt),
        }) as SbaClassSubmission
    );
  }

  static async getSubmission(
    schoolCode: string,
    submissionId: string
  ): Promise<SbaClassSubmission | null> {
    const snap = await getDoc(
      doc(db, "schools", schoolCode, "sbaSubmissions", submissionId)
    );
    if (!snap.exists()) return null;
    return {
      ...snap.data(),
      createdAt: toDate(snap.data().createdAt),
      updatedAt: toDate(snap.data().updatedAt),
      frozenAt: toDate(snap.data().frozenAt),
    } as SbaClassSubmission;
  }

  /**
   * Creates the class submission as a draft if it does not exist yet
   * (idempotent). Runs once per class when scoring first begins; a
   * transaction (needs connectivity) is fine here because it is a one-off
   * setup, not the per-mark write path.
   */
  static async ensureDraft(
    schoolCode: string,
    actorUid: string,
    meta: SbaSubmissionMeta
  ): Promise<void> {
    const id = sbaSubmissionId(meta);
    const ref = doc(db, "schools", schoolCode, "sbaSubmissions", id);

    await runTransaction(db, async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists()) return; // idempotent - never rewinds a live sheet
      tx.set(ref, {
        submissionId: id,
        planId: meta.planId,
        academicYearId: meta.academicYearId,
        academicLevelCode: meta.academicLevelCode,
        streamId: meta.streamId,
        subjectId: meta.subjectId,
        teacherId: meta.teacherId ?? null,
        status: "draft",
        lastActionByUid: actorUid,
        createdByUid: actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  /** Subject teacher submits an open sheet for moderation/approval. */
  static async submit(
    schoolCode: string,
    actorUid: string,
    submissionId: string
  ): Promise<void> {
    await this.transition(
      schoolCode,
      actorUid,
      submissionId,
      ["draft", "returned"],
      "submitted",
      { submittedByUid: actorUid }
    );
  }

  /** Manager reopens a submitted sheet straight back to draft. */
  static async withdraw(
    schoolCode: string,
    actorUid: string,
    submissionId: string
  ): Promise<void> {
    await this.transition(
      schoolCode,
      actorUid,
      submissionId,
      ["submitted"],
      "draft",
      {}
    );
  }

  /** HOD moderates a submitted sheet. */
  static async moderate(
    schoolCode: string,
    actorUid: string,
    submissionId: string
  ): Promise<void> {
    await this.transition(
      schoolCode,
      actorUid,
      submissionId,
      ["submitted"],
      "moderated",
      { moderatedByUid: actorUid }
    );
  }

  /**
   * Head Teacher approves (and signs off) a sheet. Moderation may be
   * skipped in small schools, so approval is allowed straight from
   * submitted. Approval is terminal for the client: the approval Cloud
   * Function freezes each learner's raw mark and the sheet becomes
   * immutable.
   */
  static async approve(
    schoolCode: string,
    actorUid: string,
    submissionId: string
  ): Promise<void> {
    await this.transition(
      schoolCode,
      actorUid,
      submissionId,
      ["submitted", "moderated"],
      "approved",
      { approvedByUid: actorUid }
    );
  }

  /** HOD/Head bounces a sheet back to the teacher for correction. */
  static async returnForCorrection(
    schoolCode: string,
    actorUid: string,
    submissionId: string
  ): Promise<void> {
    await this.transition(
      schoolCode,
      actorUid,
      submissionId,
      ["submitted", "moderated"],
      "returned",
      {}
    );
  }

  /**
   * Moves a submission between states and mirrors the new status onto its
   * marks (so the mark rules can freeze/unfreeze rows by their own status
   * field, without a cross-document get()). Status is the only thing the
   * marks change here - scores are untouched.
   */
  private static async transition(
    schoolCode: string,
    actorUid: string,
    submissionId: string,
    from: SbaSubmissionStatus[],
    to: SbaSubmissionStatus,
    extra: Record<string, unknown>
  ): Promise<void> {
    const subRef = doc(db, "schools", schoolCode, "sbaSubmissions", submissionId);
    const snap = await getDoc(subRef);
    if (!snap.exists()) throw new Error("No score sheet to update yet.");
    const current = snap.data().status as SbaSubmissionStatus;
    if (!from.includes(current)) {
      throw new Error(`This sheet is ${current} and can't be changed that way.`);
    }

    const marksSnap = await getDocs(
      query(
        collection(db, "schools", schoolCode, "sbaMarks"),
        where("submissionId", "==", submissionId)
      )
    );

    const batch = writeBatch(db);
    batch.update(subRef, {
      status: to,
      lastActionByUid: actorUid,
      ...extra,
      updatedAt: serverTimestamp(),
    });
    for (const m of marksSnap.docs) {
      batch.update(m.ref, {
        status: to,
        lastActionByUid: actorUid,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}
