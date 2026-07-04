import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "../admin";

/**
 * Writes the admission audit log server-side when a student is created.
 *
 * Audit logs are sacred - the security rules deny all client writes to
 * auditLogs, so this runs with the Admin SDK. The acting user is
 * recorded from the admittedByUid the client stamped on the student,
 * since a Firestore trigger has no auth context of its own.
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
  }
);
