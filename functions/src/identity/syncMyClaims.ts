import { onCall, HttpsError } from "firebase-functions/v2/https";

import { adminAuth, adminDb } from "../admin";

/**
 * Aligns the caller's custom claims with their users/{uid} profile.
 *
 * Safe to expose to any signed-in user because profile security fields
 * (role, schoolCode, active) are only writable by a super administrator
 * or the Admin SDK - a user cannot grant themselves a role here that
 * they were not already given in Firestore.
 *
 * Exists to backfill accounts created before custom claims (and to
 * self-heal whenever a super admin changes someone's role).
 */
export const syncMyClaims = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to sync your claims."
    );
  }

  const uid = request.auth.uid;

  const snapshot = await adminDb.doc(`users/${uid}`).get();

  if (!snapshot.exists) {
    throw new HttpsError(
      "not-found",
      "No user profile exists for this account."
    );
  }

  const profile = snapshot.data();

  if (profile?.active !== true) {
    throw new HttpsError("permission-denied", "This account is disabled.");
  }

  const claims = {
    role: profile.role as string,
    schoolCode: profile.schoolCode as string,
  };

  await adminAuth.setCustomUserClaims(uid, claims);

  return claims;
});
