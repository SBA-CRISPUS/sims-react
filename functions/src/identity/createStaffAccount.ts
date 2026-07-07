import { randomInt } from "node:crypto";

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "../admin";
import { assertCallerManagesSchool } from "./assertCallerManagesSchool";

/**
 * The leadership roles a school administrator may provision. Teachers are
 * NOT created here - they go through the Teacher HR record +
 * createTeacherAccount so the employeeNumber link exists. super_admin is
 * platform-level and never school-created.
 */
const STAFF_ROLES = [
  "school_admin",
  "head_teacher",
  "deputy_head",
  "hod",
] as const;

export interface CreateStaffAccountRequest {
  schoolCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: (typeof STAFF_ROLES)[number];
}

export interface CreateStaffAccountResult {
  user: {
    uid: string;
    displayName: string;
    email: string;
    role: string;
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
 * Provisions a leadership login (head teacher, deputy, HOD, or another
 * administrator) for the caller's school: Firebase Auth user + custom
 * claims {role, schoolCode} + users/{uid} profile with
 * mustChangePassword: true. All-or-nothing rollback, mirroring
 * createSchoolAdministrator / createTeacherAccount.
 */
export const createStaffAccount = onCall(async (request) => {
  const data = request.data as CreateStaffAccountRequest;

  const email = String(data?.email ?? "").trim().toLowerCase();
  const firstName = String(data?.firstName ?? "").trim();
  const lastName = String(data?.lastName ?? "").trim();
  if (!data?.schoolCode || !email || !firstName || !lastName || !data?.role) {
    throw new HttpsError(
      "invalid-argument",
      "schoolCode, firstName, lastName, email and role are required."
    );
  }
  if (!STAFF_ROLES.includes(data.role)) {
    throw new HttpsError(
      "invalid-argument",
      `role must be one of: ${STAFF_ROLES.join(", ")}. Teacher logins are created from the teacher's profile.`
    );
  }

  await assertCallerManagesSchool(request, data.schoolCode, "create staff accounts");

  const displayName = `${firstName} ${lastName}`;
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
      role: data.role,
      schoolCode: data.schoolCode,
    });

    await adminDb.doc(`users/${uid}`).set({
      uid,
      schoolCode: data.schoolCode,
      displayName,
      email,
      phone: String(data.phone ?? "").trim(),
      role: data.role,
      active: true,
      mustChangePassword: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // Roll back so a retry starts clean.
    await adminAuth.deleteUser(uid).catch(() => undefined);
    await adminDb.doc(`users/${uid}`).delete().catch(() => undefined);
    throw new HttpsError("internal", "Failed to provision the staff account.");
  }

  const result: CreateStaffAccountResult = {
    user: { uid, displayName, email, role: data.role },
    credentials: { temporaryPassword },
  };
  return result;
});
