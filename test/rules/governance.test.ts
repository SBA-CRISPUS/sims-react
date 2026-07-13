import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

import { actor, makeEnv, SCH_A, seed, seedSchool } from "./_helpers";

/**
 * GOVERNANCE SURFACES — entitlement freezing, the audit trail, the money
 * ledgers, the system master data, and the counters. These are where a
 * school could try to self-upgrade, rewrite history, or enumerate the
 * platform.
 */
describe("Governance & entitlement", () => {
  let env: RulesTestEnvironment;
  beforeAll(async () => {
    env = await makeEnv();
  });
  afterAll(async () => {
    await env.cleanup();
  });
  beforeEach(async () => {
    await env.clearFirestore();
    await seedSchool(env, SCH_A);
    await seed(env, async (db) => {
      await setDoc(doc(db, `schools/${SCH_A}/auditLogs/L1`), { action: "x" });
      await setDoc(doc(db, `schools/${SCH_A}/payments/P1`), {
        recordedByUid: "someone",
        studentId: "STU-1",
        academicYearId: "AY-2026",
        amount: 50,
      });
      await setDoc(doc(db, "system/counters"), { nextSchoolNumber: 5 });
      await setDoc(doc(db, `directory/${SCH_A}`), { name: "Test School", active: true });
      await setDoc(doc(db, "learners/SL-1"), { learnerId: "SL-1" });
    });
  });

  // --- entitlement freeze on the school doc ---
  it("allows a school admin to edit descriptive fields (name)", async () => {
    await assertSucceeds(
      updateDoc(doc(actor.adminA(env), `schools/${SCH_A}`), { name: "Renamed School" })
    );
  });

  it("blocks a school admin self-upgrading their subscription", async () => {
    await assertFails(
      updateDoc(doc(actor.adminA(env), `schools/${SCH_A}`), { subscription: "Enterprise" })
    );
  });

  it("blocks a school admin un-suspending themselves (status)", async () => {
    await assertFails(
      updateDoc(doc(actor.adminA(env), `schools/${SCH_A}`), { status: "suspended" })
    );
  });

  it("blocks a school admin flipping ownership (drives fee gating)", async () => {
    await assertFails(
      updateDoc(doc(actor.adminA(env), `schools/${SCH_A}`), { ownership: "Government" })
    );
  });

  it("blocks a school admin enabling a paid add-on feature", async () => {
    await assertFails(
      updateDoc(doc(actor.adminA(env), `schools/${SCH_A}`), { features: { sbaEvidence: true } })
    );
  });

  it("blocks a school admin extending their own expiry date", async () => {
    await assertFails(
      updateDoc(doc(actor.adminA(env), `schools/${SCH_A}`), {
        subscriptionExpiresAt: "2099-12-31",
      })
    );
  });

  it("blocks a school admin self-granting an approval policy", async () => {
    await assertFails(
      updateDoc(doc(actor.adminA(env), `schools/${SCH_A}`), {
        policies: { adminMayApproveSba: true },
      })
    );
  });

  // --- audit trail ---
  it("blocks any client writing an audit log", async () => {
    await assertFails(
      setDoc(doc(actor.adminA(env), `schools/${SCH_A}/auditLogs/L9`), { action: "forged" })
    );
  });

  it("blocks a non-admin reading audit logs", async () => {
    await assertFails(getDoc(doc(actor.teacherA(env), `schools/${SCH_A}/auditLogs/L1`)));
  });

  it("allows an admin to read their own school's audit logs", async () => {
    await assertSucceeds(getDoc(doc(actor.adminA(env), `schools/${SCH_A}/auditLogs/L1`)));
  });

  // --- money ledgers are append-only ---
  it("blocks editing a payment entry (append-only ledger)", async () => {
    await assertFails(
      updateDoc(doc(actor.adminA(env), `schools/${SCH_A}/payments/P1`), { amount: 0 })
    );
  });

  it("blocks recording a payment under a forged recordedByUid", async () => {
    await assertFails(
      setDoc(doc(actor.adminA(env), `schools/${SCH_A}/payments/P2`), {
        recordedByUid: "not-me",
        studentId: "STU-1",
        academicYearId: "AY-2026",
        amount: 100,
      })
    );
  });

  it("blocks a plain teacher recording a payment", async () => {
    await assertFails(
      setDoc(doc(actor.teacherA(env), `schools/${SCH_A}/payments/P3`), {
        recordedByUid: "teacherA-uid",
        studentId: "STU-1",
        academicYearId: "AY-2026",
        amount: 100,
      })
    );
  });

  it("blocks a school admin writing the platform billing ledger (super only)", async () => {
    await assertFails(
      setDoc(doc(actor.adminA(env), `schools/${SCH_A}/subscriptionLedger/S1`), {
        recordedByUid: "adminA-uid",
        amount: 100,
      })
    );
  });

  // --- system master data / enumeration ---
  it("blocks a signed-in non-super reading system/counters (school-code enumeration)", async () => {
    await assertFails(getDoc(doc(actor.adminA(env), "system/counters")));
  });

  it("blocks a school admin reading the platform learner registry", async () => {
    await assertFails(getDoc(doc(actor.adminA(env), "learners/SL-1")));
  });

  it("allows any signed-in user to read the school directory (transfer lookup)", async () => {
    await assertSucceeds(getDoc(doc(actor.teacherA(env), `directory/${SCH_A}`)));
  });

  it("blocks a non-super writing the directory", async () => {
    await assertFails(
      setDoc(doc(actor.adminA(env), `directory/${SCH_A}`), { name: "Spoofed", active: true })
    );
  });

  // --- counters ---
  it("blocks a plain teacher incrementing the teacher counter", async () => {
    await assertFails(
      setDoc(doc(actor.teacherA(env), `schools/${SCH_A}/counters/teachers`), { current: 1 })
    );
  });

  it("allows a head teacher to touch the students counter (admission path)", async () => {
    await assertSucceeds(
      setDoc(doc(actor.headA(env), `schools/${SCH_A}/counters/students`), { current: 1 })
    );
  });
});
