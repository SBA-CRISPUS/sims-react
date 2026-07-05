import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "../admin";

/**
 * Audits every SBA submission status change and freezes the marks on
 * approval.
 *
 * Two server-only jobs the client must never do itself:
 *   1. AUDIT - auditLogs are CF-only (rules deny client writes). One entry
 *      per real status transition, attributed to the client-stamped
 *      lastActionByUid (a Firestore trigger has no auth context).
 *   2. FREEZE - when a sheet is approved, recompute each learner's raw SBA
 *      mark from taskScores x the plan and write the frozen snapshot
 *      (obtainedTotal/rawScore) onto the marks. Those fields are locked
 *      against clients by the rules, so the Admin SDK is their sole author.
 *      The recompute is idempotent (safe under at-least-once delivery).
 *
 * Status is propagated onto the marks by the client transition (one batch,
 * immediate), so this trigger does not touch mark status - only the frozen
 * totals. It writes auditLogs + sbaMarks, never sbaSubmissions, so it never
 * re-triggers itself.
 */

const ACTION_BY_STATUS: Record<string, string> = {
  submitted: "submitted",
  moderated: "moderated",
  approved: "approved",
  returned: "returned",
  draft: "reopened",
  locked: "locked",
};

interface PlanTask {
  taskId: string;
  maxMarks: number;
}

function frozenTotals(
  taskScores: Record<string, number> | undefined,
  tasks: PlanTask[]
): { obtainedTotal: number; rawScore: number } {
  const scores = taskScores ?? {};
  const max = tasks.reduce((s, t) => s + (Number(t.maxMarks) || 0), 0);
  const got = tasks.reduce((s, t) => s + (Number(scores[t.taskId]) || 0), 0);
  return {
    obtainedTotal: got,
    rawScore: max > 0 ? Math.round((got / max) * 100) : 0,
  };
}

async function freezeMarks(schoolCode: string, submissionId: string, planId: string) {
  const planSnap = await adminDb.doc(`schools/${schoolCode}/sbaPlans/${planId}`).get();
  if (!planSnap.exists) return; // no plan to score against - nothing to freeze
  const tasks = (planSnap.data()?.tasks ?? []) as PlanTask[];

  const marksSnap = await adminDb
    .collection(`schools/${schoolCode}/sbaMarks`)
    .where("submissionId", "==", submissionId)
    .get();

  // Chunk under Firestore's 500-writes-per-batch limit.
  const docs = marksSnap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = adminDb.batch();
    for (const d of docs.slice(i, i + 400)) {
      const mark = d.data();
      if (mark.notTaking === true) {
        // Excluded learner - carries no SBA mark.
        batch.update(d.ref, {
          obtainedTotal: null,
          rawScore: null,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        batch.update(d.ref, {
          ...frozenTotals(mark.taskScores, tasks),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
    await batch.commit();
  }
}

export const onSbaSubmissionWritten = onDocumentWritten(
  "schools/{schoolCode}/sbaSubmissions/{submissionId}",
  async (event) => {
    const { schoolCode, submissionId } = event.params;
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    // Deleted (rules forbid) or created (initial draft - not audited).
    if (!after || !before) return;

    const beforeStatus = before.status as string | undefined;
    const afterStatus = after.status as string | undefined;
    if (!afterStatus || beforeStatus === afterStatus) return; // no transition

    await adminDb.collection(`schools/${schoolCode}/auditLogs`).add({
      action: `sba.submission.${ACTION_BY_STATUS[afterStatus] ?? afterStatus}`,
      submissionId,
      academicYearId: after.academicYearId ?? null,
      academicLevelCode: after.academicLevelCode ?? null,
      streamId: after.streamId ?? null,
      subjectId: after.subjectId ?? null,
      actorUid: after.lastActionByUid ?? null,
      at: FieldValue.serverTimestamp(),
    });

    if (afterStatus === "approved") {
      await freezeMarks(schoolCode, submissionId, after.planId as string);
    }
  }
);
