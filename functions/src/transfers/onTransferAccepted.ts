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

/**
 * Executes an accepted transfer - the ONLY place cross-school writes happen
 * (Admin SDK). On a request moving to 'accepted' it:
 *   1. imports the learner into the RECEIVING school (new student +
 *      enrollment) from the snapshot, idempotent by learnerId;
 *   2. closes the SENDING school's active enrollment(s) and marks that
 *      student 'transferred' (the record stays - history is preserved);
 *   3. relinks the platform learner registry to the new school;
 *   4. audits both schools and marks the request 'completed'.
 *
 * Guards against re-processing (re-reads the live request; the 'completed'
 * write does not re-enter because it isn't the 'accepted' transition).
 */
export const onTransferAccepted = onDocumentWritten(
  "transferRequests/{requestId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after) return;
    if (after.status !== "accepted") return; // only the -> accepted transition
    if (before?.status === "accepted") return;

    const requestRef = event.data!.after!.ref;
    const live = await requestRef.get();
    const req = live.data();
    if (!req || req.status !== "accepted") return; // already processed

    const fromSchoolCode = req.fromSchoolCode as string;
    const toSchoolCode = req.toSchoolCode as string;
    const learnerId = (req.learnerId as string | null) ?? null;
    const snapshot = req.studentSnapshot as {
      identity: SnapshotIdentity;
      enrollments: Array<{ academicYearId: string; academicLevelCode: string }>;
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
        guardianIds: [],
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
      toSchoolCode,
      at: FieldValue.serverTimestamp(),
    });

    // 3. Relink the platform learner registry to the new school.
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
