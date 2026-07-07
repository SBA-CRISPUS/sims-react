import { onDocumentWritten } from "firebase-functions/v2/firestore";

import { adminAuth } from "../admin";

/**
 * Keeps Firebase Auth in step with the users/{uid} profile - closes the
 * stale-claims hole flagged in the Phase 13 adversarial review: without
 * this, reassigning or deactivating a user in Firestore left their old
 * {role, schoolCode} claims live until token expiry (indefinitely if they
 * never re-authenticated).
 *
 * On any change to the security fields (role / schoolCode /
 * employeeNumber / active):
 *   1. rewrites the custom claims from the profile (the profile is the
 *      source of truth; claims are its projection);
 *   2. revokes refresh tokens so the old token dies at expiry (<=1h)
 *      instead of living forever;
 *   3. disables/enables the Auth account when active flips.
 *
 * Skips creations (the identity callables already set claims atomically
 * with the profile) and profile edits that don't touch security fields
 * (e.g. clearing mustChangePassword). Writes nothing back to users/{uid},
 * so it never re-triggers itself.
 */
export const onUserProfileWritten = onDocumentWritten(
  "users/{uid}",
  async (event) => {
    const before = event.data?.before?.exists
      ? event.data.before.data()
      : undefined;
    const after = event.data?.after?.exists
      ? event.data.after.data()
      : undefined;
    if (!before || !after) return; // creation (claims set by the callable) or rollback delete

    const changed =
      before.role !== after.role ||
      before.schoolCode !== after.schoolCode ||
      before.employeeNumber !== after.employeeNumber ||
      before.active !== after.active;
    if (!changed) return;

    const { uid } = event.params;

    try {
      await adminAuth.setCustomUserClaims(uid, {
        role: after.role ?? null,
        schoolCode: after.schoolCode ?? null,
        ...(after.employeeNumber
          ? { employeeNumber: after.employeeNumber }
          : {}),
      });

      if (before.active !== after.active) {
        await adminAuth.updateUser(uid, { disabled: after.active === false });
      }

      // Old tokens keep the old claims until they expire; revoking the
      // refresh tokens caps that window at the ID-token lifetime (~1h).
      await adminAuth.revokeRefreshTokens(uid);
    } catch (error) {
      // A profile without an Auth account (seed scripts, console edits)
      // is not an error worth retrying - log and move on.
      console.error(`Claims sync failed for ${uid}`, error);
    }
  }
);
