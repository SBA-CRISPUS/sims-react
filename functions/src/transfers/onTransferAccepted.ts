import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "../admin";

function pad(n: number): string {
  return String(n).padStart(6, "0");
}

/** Allocates a receiving-school student number + admission id from that
 * school's local counters (transaction serialises concurrent imports). */
async function allocateAdmission(
  schoolCode: string
): Promise<{ studentNumber: string; admissionId: string }> {
  const year = new Date().getFullYear();
  const studentsCounter = adminDb.doc(`schools/${schoolCode}/counters/students`);
  const admissionsCounter = adminDb.doc(
    `schools/${schoolCode}/counters/admissions-${year}`
  );
  return adminDb.runTransaction(async (tx) => {
    const [s, a] = await Promise.all([
      tx.get(studentsCounter),
      tx.get(admissionsCounter),
    ]);
    const nextS = ((s.data()?.current as number) ?? 0) + 1;
    const nextA = ((a.data()?.current as number) ?? 0) + 1;
    tx.set(studentsCounter, { current: nextS }, { merge: true });
    tx.set(admissionsCounter, { current: nextA }, { merge: true });
    return {
      studentNumber: `STU-${pad(nextS)}`,
      admissionId: `ADM-${year}-${pad(nextA)}`,
    };
  });
}

/** Mints the human-readable transfer number (TRF-YYYY-NNNNNN) from a
 * global counter - the id schools quote and audit entries reference,
 * platform-unique like the learner id. */
async function allocateTransferNumber(): Promise<string> {
  const counterRef = adminDb.doc("system/counters");
  const year = new Date().getFullYear();
  const next = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const n = ((snap.data()?.transfers as number) ?? 0) + 1;
    tx.set(counterRef, { transfers: n }, { merge: true });
    return n;
  });
  return `TRF-${year}-${pad(next)}`;
}

interface SnapshotIdentity {
  learnerId: string | null;
  studentNumber: string;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  gender: string;
  dateOfBirth: string | null;
  nationality: string;
  examinationNumber: string | null;
}

interface SnapshotGuardian {
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string;
  alternativePhone: string | null;
  email: string | null;
  address: string | null;
}

interface TransferAuditEntry {
  action: string;
  transferNumber: string | null;
  studentNumber: string;
  learnerId: string | null;
  toSchoolCode: string;
  actorUid: string | null;
  note?: string | null;
}

function audit(schoolCode: string, entry: TransferAuditEntry) {
  return adminDb.collection(`schools/${schoolCode}/auditLogs`).add({
    ...entry,
    at: FieldValue.serverTimestamp(),
  });
}

// Client-driven transitions the sender's audit trail records (the CF's own
// 'completed' write is covered by student.transferred_out/_in instead).
const TRANSITION_ACTIONS: Record<string, string> = {
  accepted: "transfer.accepted",
  rejected: "transfer.rejected",
  info_requested: "transfer.info_requested",
  cancelled: "transfer.cancelled",
};

/**
 * The transfer workflow's server side - the ONLY place cross-school writes
 * happen (Admin SDK).
 *
 * On CREATE: mints the transfer number (TRF-YYYY-NNNNNN, global counter)
 * onto the request and audits 'transfer.requested' at the sender.
 *
 * On STATUS TRANSITIONS (accept/reject/request-info/cancel): appends the
 * lifecycle event to the sender's auditLogs, so the learner's audit tab
 * tells the whole story (mentor review, 2026-07-07).
 *
 * On -> accepted it executes the transfer:
 *   1. imports the learner into the RECEIVING school (new student +
 *      guardians + enrollment) from the envelope, idempotent by learnerId;
 *   2. closes the SENDING school's active enrollment(s) and marks that
 *      student 'transferred' (the record stays - history is preserved);
 *   3. relinks the platform learner registry (an identity-only projection;
 *      the active enrollment stays the source of truth);
 *   4. audits both schools and marks the request 'completed'.
 *
 * Guards against re-processing (re-reads the live request; the 'completed'
 * write does not re-enter because it isn't the 'accepted' transition).
 */
export const onTransferAccepted = onDocumentWritten(
  "transferRequests/{requestId}",
  async (event) => {
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;
    const after = afterSnap?.data();
    if (!afterSnap || !after) return;
    const before = beforeSnap?.exists ? beforeSnap.data() : undefined;

    // --- Creation: stamp the transfer number + audit 'requested'. -------
    if (!before) {
      const live = await afterSnap.ref.get();
      if (!live.exists || live.data()?.transferNumber) return; // re-delivery
      const transferNumber = await allocateTransferNumber();
      await afterSnap.ref.update({ transferNumber });
      await audit(after.fromSchoolCode as string, {
        action: "transfer.requested",
        transferNumber,
        studentNumber: after.studentNumber as string,
        learnerId: (after.learnerId as string | null) ?? null,
        toSchoolCode: after.toSchoolCode as string,
        actorUid: (after.requestedByUid as string | null) ?? null,
      });
      return;
    }

    // --- Lifecycle audit for client transitions. ------------------------
    const action =
      before.status !== after.status ? TRANSITION_ACTIONS[after.status] : null;
    if (action) {
      await audit(after.fromSchoolCode as string, {
        action,
        transferNumber: (after.transferNumber as string | null) ?? null,
        studentNumber: after.studentNumber as string,
        learnerId: (after.learnerId as string | null) ?? null,
        toSchoolCode: after.toSchoolCode as string,
        actorUid:
          after.status === "cancelled"
            ? ((after.cancelledByUid as string | null) ?? null)
            : ((after.decidedByUid as string | null) ?? null),
        note: (after.decisionNote as string | null) ?? null,
      });
    }

    if (after.status !== "accepted") return; // only the -> accepted transition
    if (before.status === "accepted") return;

    const requestRef = afterSnap.ref;
    const live = await requestRef.get();
    const req = live.data();
    if (!req || req.status !== "accepted") return; // already processed

    const fromSchoolCode = req.fromSchoolCode as string;
    const toSchoolCode = req.toSchoolCode as string;
    const learnerId = (req.learnerId as string | null) ?? null;
    const transferNumber = (req.transferNumber as string | null) ?? null;
    const snapshot = req.studentSnapshot as {
      identity: SnapshotIdentity;
      enrollments: Array<{ academicYearId: string; academicLevelCode: string }>;
      guardians?: SnapshotGuardian[];
      cbc?: Record<string, unknown> | null;
    };
    const identity = snapshot.identity;
    const fromStudentNumber = identity.studentNumber;

    // 1. Import into the receiving school (idempotent by learnerId).
    let toStudentNumber: string | null = null;
    if (learnerId) {
      const existing = await adminDb
        .collection(`schools/${toSchoolCode}/students`)
        .where("learnerId", "==", learnerId)
        .limit(1)
        .get();
      if (!existing.empty) toStudentNumber = existing.docs[0].id;
    }

    if (!toStudentNumber) {
      const { studentNumber, admissionId } = await allocateAdmission(toSchoolCode);
      toStudentNumber = studentNumber;

      const schoolSnap = await adminDb.doc(`schools/${toSchoolCode}`).get();
      const yearId =
        (schoolSnap.data()?.currentAcademicYearId as string) ??
        `AY-${new Date().getFullYear()}`;
      const latest = [...(snapshot.enrollments ?? [])]
        .sort((a, b) => a.academicYearId.localeCompare(b.academicYearId))
        .pop();
      const levelCode = latest?.academicLevelCode ?? "F1";

      // Guardians travel in the envelope; the receiver creates its OWN
      // guardian records (copy, never reference - schools own their
      // records independently after transfer).
      const guardians = snapshot.guardians ?? [];
      let guardianIds: string[] = [];
      if (guardians.length > 0) {
        const counterRef = adminDb.doc(
          `schools/${toSchoolCode}/counters/guardians`
        );
        const first = await adminDb.runTransaction(async (tx) => {
          const snap = await tx.get(counterRef);
          const cur = (snap.data()?.current as number) ?? 0;
          tx.set(counterRef, { current: cur + guardians.length }, { merge: true });
          return cur + 1;
        });
        guardianIds = guardians.map((_, i) => `GRD-${pad(first + i)}`);
        const guardianBatch = adminDb.batch();
        guardians.forEach((g, i) => {
          guardianBatch.set(
            adminDb.doc(`schools/${toSchoolCode}/guardians/${guardianIds[i]}`),
            {
              guardianId: guardianIds[i],
              firstName: g.firstName,
              lastName: g.lastName,
              relationship: g.relationship,
              phone: g.phone,
              alternativePhone: g.alternativePhone ?? null,
              email: g.email ?? null,
              address: g.address ?? null,
              transferredFrom: fromSchoolCode,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            }
          );
        });
        await guardianBatch.commit();
      }

      await adminDb.doc(`schools/${toSchoolCode}/students/${toStudentNumber}`).set({
        studentNumber: toStudentNumber,
        learnerId: learnerId ?? null,
        admissionNumber: admissionId,
        admissionId,
        examinationNumber: identity.examinationNumber ?? null,
        firstName: identity.firstName,
        lastName: identity.lastName,
        otherNames: identity.otherNames ?? null,
        gender: identity.gender,
        dateOfBirth: identity.dateOfBirth ? new Date(identity.dateOfBirth) : null,
        nationality: identity.nationality ?? "Zambian",
        cbc: snapshot.cbc ?? null,
        guardianIds,
        admittedByUid: null,
        transferredFrom: fromSchoolCode,
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // streamId is left blank - the receiving school assigns placement.
      await adminDb.collection(`schools/${toSchoolCode}/enrollments`).add({
        studentId: toStudentNumber,
        academicYearId: yearId,
        academicLevelCode: levelCode,
        streamId: "",
        admissionId,
        admissionDate: FieldValue.serverTimestamp(),
        status: "active",
        transferredFrom: fromSchoolCode,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await adminDb.collection(`schools/${toSchoolCode}/auditLogs`).add({
        action: "student.transferred_in",
        studentNumber: toStudentNumber,
        learnerId: learnerId ?? null,
        transferNumber,
        fromSchoolCode,
        at: FieldValue.serverTimestamp(),
      });
    }

    // 2. Close the sending school's active enrollment(s) + mark transferred.
    const sendEnroll = await adminDb
      .collection(`schools/${fromSchoolCode}/enrollments`)
      .where("studentId", "==", fromStudentNumber)
      .get();
    const batch = adminDb.batch();
    sendEnroll.docs
      .filter((d) => d.data().status === "active")
      .forEach((d) =>
        batch.update(d.ref, {
          status: "transferred",
          updatedAt: FieldValue.serverTimestamp(),
        })
      );
    batch.update(
      adminDb.doc(`schools/${fromSchoolCode}/students/${fromStudentNumber}`),
      { status: "transferred", updatedAt: FieldValue.serverTimestamp() }
    );
    await batch.commit();

    await adminDb.collection(`schools/${fromSchoolCode}/auditLogs`).add({
      action: "student.transferred_out",
      studentNumber: fromStudentNumber,
      learnerId: learnerId ?? null,
      transferNumber,
      toSchoolCode,
      at: FieldValue.serverTimestamp(),
    });

    // 3. Relink the platform learner registry (identity-only projection of
    // the active enrollment - rebuildable, never the source of truth).
    if (learnerId) {
      await adminDb.doc(`learners/${learnerId}`).set(
        {
          currentSchoolCode: toSchoolCode,
          currentStudentNumber: toStudentNumber,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // 4. Mark the request completed.
    await requestRef.update({
      status: "completed",
      importedStudentNumber: toStudentNumber,
      completedAt: FieldValue.serverTimestamp(),
    });
  }
);
