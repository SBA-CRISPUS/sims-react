import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { actor, makeEnv, SCH_A, seed, seedSchool } from "./_helpers";

/**
 * TENANT ISOLATION — the load-bearing invariant of a multi-tenant SIS.
 * A member of school B must never read or write school A's records.
 */
describe("Tenant isolation", () => {
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
      await setDoc(doc(db, `schools/${SCH_A}/students/STU-1`), {
        firstName: "A",
        lastName: "B",
        status: "active",
      });
      await setDoc(doc(db, `schools/${SCH_A}/teachers/TCH-A1`), {
        firstName: "T",
        status: "active",
      });
      await setDoc(doc(db, `schools/${SCH_A}/payments/P1`), {
        recordedByUid: "x",
        studentId: "STU-1",
        academicYearId: "AY-2026",
        amount: 100,
      });
    });
    await seedSchool(env, SCH_A);
  });

  it("blocks school B admin reading school A students", async () => {
    await assertFails(getDoc(doc(actor.adminB(env), `schools/${SCH_A}/students/STU-1`)));
  });

  it("blocks school B admin reading school A teachers", async () => {
    await assertFails(getDoc(doc(actor.adminB(env), `schools/${SCH_A}/teachers/TCH-A1`)));
  });

  it("blocks school B admin reading school A payments", async () => {
    await assertFails(getDoc(doc(actor.adminB(env), `schools/${SCH_A}/payments/P1`)));
  });

  it("blocks school B admin reading school A's school doc", async () => {
    await assertFails(getDoc(doc(actor.adminB(env), `schools/${SCH_A}`)));
  });

  it("blocks school B admin writing a student into school A", async () => {
    await assertFails(
      setDoc(doc(actor.adminB(env), `schools/${SCH_A}/students/STU-9`), {
        firstName: "X",
        status: "active",
      })
    );
  });

  it("allows school A admin to read their own school doc (control)", async () => {
    await assertSucceeds(getDoc(doc(actor.adminA(env), `schools/${SCH_A}`)));
  });
});
