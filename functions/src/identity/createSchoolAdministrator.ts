import { randomInt } from "node:crypto";

import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "../admin";

export interface CreateAdministratorRequest {
  schoolCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface CreateAdministratorResult {
  uid: string;
  email: string;
  displayName: string;
  temporaryPassword: string;
}

// No 0/O, 1/l/I: temporary passwords get read aloud and typed from paper.
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
 * Custom claims are only assigned by this identity service, so early
 * callers (created before claims existed) fall back to their
 * users/{uid} profile role.
 */
async function assertCallerIsSuperAdmin(
  request: CallableRequest
): Promise<void> {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to provision an administrator."
    );
  }

  if (request.auth.token.role === "super_admin") {
    return;
  }

  const callerSnapshot = await adminDb
    .doc(`users/${request.auth.uid}`)
    .get();

  const caller = callerSnapshot.data();

  if (
    !callerSnapshot.exists ||
    caller?.role !== "super_admin" ||
    caller?.active !== true
  ) {
    throw new HttpsError(
      "permission-denied",
      "Only an active super administrator can provision school administrators."
    );
  }
}

export const createSchoolAdministrator = onCall(async (request) => {
  await assertCallerIsSuperAdmin(request);

  const data = request.data as CreateAdministratorRequest;

  if (
    !data?.schoolCode ||
    !data?.firstName ||
    !data?.lastName ||
    !data?.email
  ) {
    throw new HttpsError(
      "invalid-argument",
      "schoolCode, firstName, lastName and email are required."
    );
  }

  const schoolSnapshot = await adminDb
    .doc(`schools/${data.schoolCode}`)
    .get();

  if (!schoolSnapshot.exists) {
    throw new HttpsError(
      "not-found",
      `School ${data.schoolCode} does not exist.`
    );
  }

  const displayName = `${data.firstName} ${data.lastName}`.trim();
  const temporaryPassword = generateTemporaryPassword();

  let uid: string;

  try {
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: temporaryPassword,
      displayName,
    });

    uid = userRecord.uid;
  } catch (error) {
    if ((error as { code?: string }).code === "auth/email-already-exists") {
      throw new HttpsError(
        "already-exists",
        `A user with email ${data.email} already exists.`
      );
    }

    throw new HttpsError(
      "internal",
      "Failed to create the authentication account."
    );
  }

  try {
    await adminAuth.setCustomUserClaims(uid, {
      role: "school_admin",
      schoolCode: data.schoolCode,
    });

    await adminDb.doc(`users/${uid}`).set({
      uid,
      schoolCode: data.schoolCode,
      displayName,
      email: data.email,
      phone: data.phone ?? "",
      role: "school_admin",
      active: true,
      mustChangePassword: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // Roll back the auth account so a retry never hits already-exists.
    await adminAuth.deleteUser(uid).catch(() => undefined);

    throw new HttpsError(
      "internal",
      "Failed to provision the administrator profile."
    );
  }

  const result: CreateAdministratorResult = {
    uid,
    email: data.email,
    displayName,
    temporaryPassword,
  };

  return result;
});
