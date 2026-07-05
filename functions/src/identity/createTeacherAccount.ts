import { randomInt } from "node:crypto";

import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "../admin";

export interface CreateTeacherAccountRequest {
  schoolCode: string;
  employeeNumber: string;
  email?: string; // optional override; defaults to the teacher record's email
}

export interface CreateTeacherAccountResult {
  user: {
    uid: string;
    displayName: string;
    email: string;
    employeeNumber: string;
  };
  credentials: {
    temporaryPassword: string;
  };
}

const PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateTemporaryPassword(length = 12): string {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return password;
}

/**
 * The caller must be an active administrator of the SAME school. Falls
 * back to the users/{uid} profile for accounts created before custom
 * claims, mirroring createSchoolAdministrator.
 */
async function assertCallerManagesSchool(
  request: CallableRequest,
  schoolCode: string
): Promise<void> {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to create a teacher account."
    );
  }

  const token = request.auth.token;
  if (token.role === "super_admin") return;
  if (token.role === "school_admin" && token.schoolCode === schoolCode) return;

  const snapshot = await adminDb.doc(`users/${request.auth.uid}`).get();
  const caller = snapshot.data();
  if (
    snapshot.exists &&
    caller?.active === true &&
    caller?.role === "school_admin" &&
    caller?.schoolCode === schoolCode
  ) {
    return;
  }

  throw new HttpsError(
    "permission-denied",
    "Only an active administrator of this school can create teacher accounts."
  );
}

/**
 * Provisions a login account for an existing teacher (HR) record and links
 * the two: creates the Firebase Auth user, sets teacher claims
 * {role, schoolCode, employeeNumber}, writes the users/{uid} profile, and
 * stamps teacher.linkedUserUid. All-or-nothing: the Auth account (and any
 * half-written profile) is rolled back on failure.
 */
export const createTeacherAccount = onCall(async (request) => {
  const data = request.data as CreateTeacherAccountRequest;

  if (!data?.schoolCode || !data?.employeeNumber) {
    throw new HttpsError(
      "invalid-argument",
      "schoolCode and employeeNumber are required."
    );
  }

  await assertCallerManagesSchool(request, data.schoolCode);

  const teacherRef = adminDb.doc(
    `schools/${data.schoolCode}/teachers/${data.employeeNumber}`
  );
  const teacherSnap = await teacherRef.get();
  if (!teacherSnap.exists) {
    throw new HttpsError(
      "not-found",
      `Teacher ${data.employeeNumber} does not exist.`
    );
  }

  const teacher = teacherSnap.data()!;
  if (teacher.status !== "active") {
    throw new HttpsError(
      "failed-precondition",
      "Only an active teacher can be given a login account."
    );
  }
  if (teacher.linkedUserUid) {
    throw new HttpsError(
      "already-exists",
      "This teacher already has a login account."
    );
  }

  const email = String(data.email ?? teacher.email ?? "").trim();
  if (!email) {
    throw new HttpsError(
      "invalid-argument",
      "The teacher record has no email address. Add one or pass an email."
    );
  }

  const displayName = [teacher.title, teacher.firstName, teacher.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const temporaryPassword = generateTemporaryPassword();

  let uid: string;
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password: temporaryPassword,
      displayName,
    });
    uid = userRecord.uid;
  } catch (error) {
    if ((error as { code?: string }).code === "auth/email-already-exists") {
      throw new HttpsError(
        "already-exists",
        `A user with email ${email} already exists.`
      );
    }
    throw new HttpsError(
      "internal",
      "Failed to create the authentication account."
    );
  }

  try {
    await adminAuth.setCustomUserClaims(uid, {
      role: "teacher",
      schoolCode: data.schoolCode,
      employeeNumber: data.employeeNumber,
    });

    await adminDb.doc(`users/${uid}`).set({
      uid,
      schoolCode: data.schoolCode,
      displayName,
      email,
      phone: teacher.phone ?? "",
      role: "teacher",
      employeeNumber: data.employeeNumber,
      active: true,
      mustChangePassword: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await teacherRef.update({
      linkedUserUid: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // Roll back so a retry starts clean.
    await adminAuth.deleteUser(uid).catch(() => undefined);
    await adminDb.doc(`users/${uid}`).delete().catch(() => undefined);
    throw new HttpsError(
      "internal",
      "Failed to provision the teacher account."
    );
  }

  const result: CreateTeacherAccountResult = {
    user: { uid, displayName, email, employeeNumber: data.employeeNumber },
    credentials: { temporaryPassword },
  };
  return result;
});
