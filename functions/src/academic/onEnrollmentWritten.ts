import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "../admin";

/**
 * Keeps each stream's occupiedCount in step with enrollments.
 *
 * On any enrollment write we RECOUNT the affected stream(s) from the
 * enrollments themselves rather than applying +/-1 deltas - so the
 * handler is idempotent (safe under Firestore's at-least-once / duplicate
 * delivery) and self-healing (a recount always converges to the truth,
 * even after a missed or doubled event). occupiedCount is only ever
 * written here (Admin SDK bypasses rules); the client rules forbid it.
 *
 * Enrollments carry academicLevelCode + streamId (the stream CODE); the
 * flat stream doc id is `{levelCode}-{streamCode}`.
 *
 * NOTE: occupancy is the count of ACTIVE enrollments matching the stream,
 * lifetime (not year-scoped). When year rollover / promotion (Sprint 6)
 * reuses a stream across years, scope the recount to the current year.
 */
function streamKey(
  data: FirebaseFirestore.DocumentData | undefined
): string | null {
  if (!data) return null;
  const level = data.academicLevelCode;
  const code = data.streamId;
  if (!level || !code) return null;
  return `${level}-${String(code).toUpperCase()}`;
}

async function recount(schoolCode: string, key: string) {
  const ref = adminDb.doc(`schools/${schoolCode}/streams/${key}`);
  const snap = await ref.get();
  if (!snap.exists) return; // free-text / undefined stream - not tracked
  const stream = snap.data();
  if (stream?.active === false) return; // don't track inactive streams

  const agg = await adminDb
    .collection(`schools/${schoolCode}/enrollments`)
    .where("academicLevelCode", "==", stream?.academicLevelCode)
    .where("streamId", "==", stream?.streamCode)
    .where("status", "==", "active")
    .count()
    .get();

  await ref.update({
    occupiedCount: agg.data().count,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export const onEnrollmentWritten = onDocumentWritten(
  "schools/{schoolCode}/enrollments/{enrollmentId}",
  async (event) => {
    const { schoolCode } = event.params;

    const keys = new Set<string>();
    const before = streamKey(event.data?.before?.data());
    const after = streamKey(event.data?.after?.data());
    if (before) keys.add(before);
    if (after) keys.add(after);

    for (const key of keys) {
      await recount(schoolCode, key);
    }
  }
);
