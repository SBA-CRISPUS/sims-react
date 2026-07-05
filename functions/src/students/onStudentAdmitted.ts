import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "../admin";

/**
 * Mints the next permanent SIMS learner id from a GLOBAL counter
 * (system/counters.learners). A single sequence across every school, so
 * the id is unique platform-wide and follows the learner for life. The
 * transaction serialises concurrent admissions.
 */
async function assignLearnerId(): Promise<string> {
  const counterRef = adminDb.doc("system/counters");
  const year = new Date().getFullYear();
  const next = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const n = ((snap.data()?.learners as number) ?? 0) + 1;
    tx.set(counterRef, { learners: n }, { merge: true });
    return n;
  });
  return `SL-${year}-${String(next).padStart(9, "0")}`;
}

/**
 * Runs when a student is admitted.
 *
 * 1. Writes the admission audit log server-side (auditLogs are CF-only;
 *    the actor comes from admittedByUid stamped by the client).
 * 2. Assigns the permanent SIMS learner id and seeds the platform learner
 *    registry (learners/{learnerId}). Both need a global counter that
 *    school clients can't touch (system/ is super-admin only), so it is
 *    done here with the Admin SDK. Idempotent: it re-reads the student and
 *    skips if a learner id is already set (safe under retry).
 */
export const onStudentAdmitted = onDocumentCreated(
  "schools/{schoolCode}/students/{studentNumber}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const student = snapshot.data();
    const { schoolCode, studentNumber } = event.params;

    await adminDb.collection(`schools/${schoolCode}/auditLogs`).add({
      action: "student.admitted",
      studentNumber,
      admissionId: student.admissionId ?? null,
      actorUid: student.admittedByUid ?? null,
      at: FieldValue.serverTimestamp(),
    });

    const fresh = await snapshot.ref.get();
    if (fresh.exists && !fresh.data()?.learnerId) {
      const learnerId = await assignLearnerId();
      await snapshot.ref.update({
        learnerId,
        updatedAt: FieldValue.serverTimestamp(),
      });
      await adminDb.doc(`learners/${learnerId}`).set({
        learnerId,
        currentSchoolCode: schoolCode,
        currentStudentNumber: studentNumber,
        firstName: student.firstName ?? null,
        lastName: student.lastName ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  }
);
