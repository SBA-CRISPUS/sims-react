import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

import { actor, makeEnv, SCH_A, SCH_B, seed, validSnapshot } from "./_helpers";

const REQ = "transferRequests/TR1";

function requestDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    requestId: "TR1",
    fromSchoolCode: SCH_A,
    toSchoolCode: SCH_B,
    status: "requested",
    requestedByUid: "adminA-uid",
    studentNumber: "STU-000001",
    learnerId: null,
    studentSnapshot: validSnapshot(),
    reason: "Family relocated",
    effectiveDate: "2026-02-01",
    ...overrides,
  };
}

/**
 * TRANSFERS — the ONLY deliberate cross-tenant surface, and therefore the
 * highest-value target. A forged or oversized envelope must be rejected
 * at creation, and only the two parties may see or act on a request.
 */
describe("Transfer request creation", () => {
  let env: RulesTestEnvironment;
  beforeAll(async () => {
    env = await makeEnv();
  });
  afterAll(async () => {
    await env.cleanup();
  });
  beforeEach(async () => {
    await env.clearFirestore();
  });

  it("allows a school admin to create a valid transfer (control)", async () => {
    await assertSucceeds(setDoc(doc(actor.adminA(env), REQ), requestDoc()));
  });

  it("blocks an oversized guardians[] array (batch-overflow / DoS vector)", async () => {
    const snapshot = validSnapshot();
    snapshot.guardians = Array.from({ length: 11 }, () => ({
      firstName: "G",
      lastName: "X",
      relationship: "Other",
      phone: "0",
      alternativePhone: null,
      email: null,
      address: null,
    }));
    await assertFails(
      setDoc(doc(actor.adminA(env), REQ), requestDoc({ studentSnapshot: snapshot }))
    );
  });

  it("blocks a snapshot missing a required identity field", async () => {
    const snapshot = validSnapshot();
    delete (snapshot.identity as Record<string, unknown>).firstName;
    await assertFails(
      setDoc(doc(actor.adminA(env), REQ), requestDoc({ studentSnapshot: snapshot }))
    );
  });

  it("blocks a snapshot with a non-string dateOfBirth (CF date-parse poison)", async () => {
    const snapshot = validSnapshot();
    (snapshot.identity as Record<string, unknown>).dateOfBirth = 1234567890;
    await assertFails(
      setDoc(doc(actor.adminA(env), REQ), requestDoc({ studentSnapshot: snapshot }))
    );
  });

  it("blocks a transfer to the SAME school", async () => {
    await assertFails(
      setDoc(doc(actor.adminA(env), REQ), requestDoc({ toSchoolCode: SCH_A }))
    );
  });

  it("blocks forging the CF-minted transfer number at creation", async () => {
    await assertFails(
      setDoc(doc(actor.adminA(env), REQ), requestDoc({ transferNumber: "TRF-2026-000001" }))
    );
  });

  it("blocks creating a transfer FROM a school you don't belong to", async () => {
    // adminA (SCH-A) tries to release a student from SCH-B.
    await assertFails(
      setDoc(
        doc(actor.adminA(env), REQ),
        requestDoc({ fromSchoolCode: SCH_B, toSchoolCode: SCH_A })
      )
    );
  });

  it("blocks a plain teacher from initiating a transfer", async () => {
    await assertFails(setDoc(doc(actor.teacherA(env), REQ), requestDoc()));
  });
});

describe("Transfer decisions & visibility", () => {
  let env: RulesTestEnvironment;
  beforeAll(async () => {
    env = await makeEnv();
  });
  afterAll(async () => {
    await env.cleanup();
  });
  beforeEach(async () => {
    await env.clearFirestore();
    await seed(env, async (db) => {
      await setDoc(doc(db, REQ), requestDoc({ transferNumber: "TRF-2026-000001" }));
    });
  });

  it("allows the RECEIVING admin to accept", async () => {
    await assertSucceeds(
      updateDoc(doc(actor.adminB(env), REQ), {
        status: "accepted",
        decidedByUid: "adminB-uid",
        decidedAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
  });

  it("blocks the receiver from forging 'completed' (CF-only import)", async () => {
    await assertFails(
      updateDoc(doc(actor.adminB(env), REQ), {
        status: "completed",
        decidedByUid: "adminB-uid",
        decidedAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
  });

  it("blocks the receiver from stamping importedStudentNumber", async () => {
    await assertFails(
      updateDoc(doc(actor.adminB(env), REQ), {
        status: "accepted",
        importedStudentNumber: "STU-999",
        decidedByUid: "adminB-uid",
        updatedAt: Date.now(),
      })
    );
  });

  it("allows the SENDING admin to cancel a pending request", async () => {
    await assertSucceeds(
      updateDoc(doc(actor.adminA(env), REQ), {
        status: "cancelled",
        cancelledByUid: "adminA-uid",
        updatedAt: Date.now(),
      })
    );
  });

  it("blocks a third, uninvolved school from reading the request", async () => {
    await assertFails(getDoc(doc(actor.adminC(env), REQ)));
  });

  it("allows the receiving party to read the request (control)", async () => {
    await assertSucceeds(getDoc(doc(actor.adminB(env), REQ)));
  });

  it("blocks the receiver from rewriting the frozen envelope while deciding", async () => {
    // A genuinely DIFFERENT snapshot: the hasOnly() guard on the decide
    // arm only permits status/decision fields to change, so any real
    // change to studentSnapshot must be rejected. (An identical rewrite
    // is a no-op that diff() sees as no change - not a tamper.)
    const tampered = validSnapshot();
    (tampered.identity as Record<string, unknown>).firstName = "Injected";
    await assertFails(
      updateDoc(doc(actor.adminB(env), REQ), {
        status: "accepted",
        decidedByUid: "adminB-uid",
        studentSnapshot: tampered,
        updatedAt: Date.now(),
      })
    );
  });
});
