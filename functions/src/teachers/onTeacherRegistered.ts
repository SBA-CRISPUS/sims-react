import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "../admin";

/**
 * Writes the audit log server-side when a teacher is registered.
 * Mirrors onStudentAdmitted: auditLogs are CF-only (rules deny client
 * writes); the actor comes from createdByUid stamped by the client.
 */
export const onTeacherRegistered = onDocumentCreated(
  "schools/{schoolCode}/teachers/{employeeNumber}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const teacher = snapshot.data();
    const { schoolCode, employeeNumber } = event.params;

    await adminDb.collection(`schools/${schoolCode}/auditLogs`).add({
      action: "teacher.registered",
      employeeNumber,
      actorUid: teacher.createdByUid ?? null,
      at: FieldValue.serverTimestamp(),
    });
  }
);
