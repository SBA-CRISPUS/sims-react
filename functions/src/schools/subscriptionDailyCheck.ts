import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Nightly subscription sweep (mentor's model). For every school with a
 * subscriptionExpiresAt date, derives the lifecycle state
 * (active -> grace for 30 days -> readonly) and stamps it on the school
 * doc as `subscriptionState`, plus `renewalReminder` markers at 30/7
 * days before expiry and at each state change.
 *
 * The web app computes the same state live from subscriptionExpiresAt
 * (that is what actually gates the UI); this stamp is the server-side
 * record - it feeds the platform console, gives an auditable trail of
 * when a school entered grace/read-only, and is where email/SMS
 * reminders will hook in once a mail provider exists.
 */
export const subscriptionDailyCheck = onSchedule(
  { schedule: "every day 03:00", timeZone: "Africa/Lusaka" },
  async () => {
    const db = getFirestore();
    const GRACE_DAYS = 30;

    const schools = await db.collection("schools").get();
    let changed = 0;

    for (const doc of schools.docs) {
      const school = doc.data();
      const iso: string | undefined = school.subscriptionExpiresAt;
      if (!iso) continue;

      const expiry = new Date(`${iso}T23:59:59Z`).getTime();
      if (Number.isNaN(expiry)) continue;

      // Same split-ceil boundary math as the web app's subscription.ts:
      // the state flips the moment the expiry day ends.
      const DAY = 86_400_000;
      const nowMs = Date.now();
      const days =
        expiry >= nowMs
          ? Math.ceil((expiry - nowMs) / DAY)
          : -Math.ceil((nowMs - expiry) / DAY);
      const state =
        days >= 0 ? "active" : -days <= GRACE_DAYS ? "grace" : "readonly";

      // Reminder stage: which milestone applies right now. Written once
      // per stage (the marker records the stage it already covered).
      const stage =
        state !== "active"
          ? state
          : days <= 7
            ? "7d"
            : days <= 30
              ? "30d"
              : null;

      const updates: Record<string, unknown> = {};
      if (school.subscriptionState !== state) {
        updates.subscriptionState = state;
      }
      if (stage && school.renewalReminder?.stage !== stage) {
        updates.renewalReminder = {
          stage,
          at: FieldValue.serverTimestamp(),
          expiresAt: iso,
        };
        logger.info("subscription reminder", {
          school: doc.id,
          stage,
          daysToExpiry: days,
        });
      }

      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates);
        changed++;
      }
    }

    logger.info("subscriptionDailyCheck complete", {
      schools: schools.size,
      updated: changed,
    });
  }
);
