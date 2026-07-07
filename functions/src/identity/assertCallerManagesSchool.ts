import { HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";

import { adminDb } from "../admin";

/**
 * The caller must be an active administrator of the SAME school (or a
 * super admin). Falls back to the users/{uid} profile for accounts created
 * before custom claims, mirroring createSchoolAdministrator.
 */
export async function assertCallerManagesSchool(
  request: CallableRequest,
  schoolCode: string,
  action: string
): Promise<void> {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      `You must be signed in to ${action}.`
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
    `Only an active administrator of this school can ${action}.`
  );
}
