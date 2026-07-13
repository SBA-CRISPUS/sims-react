import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { actor, makeEnv, SCH_A, seed } from "./_helpers";

/**
 * PII READ SCOPING — student/guardian/enrollment records are the app's
 * most sensitive data. Read must be staff-only (the fix); write must be
 * student-managing staff only.
 */
describe("Student PII scoping", () => {
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
        dateOfBirth: "2010-01-01",
        status: "active",
      });
      await setDoc(doc(db, `schools/${SCH_A}/guardians/GRD-1`), {
        firstName: "G",
        phone: "0970",
      });
      await setDoc(doc(db, `schools/${SCH_A}/enrollments/E1`), {
        studentId: "STU-1",
        streamId: "F2-A",
        status: "active",
      });
    });
  });

  it("allows a teacher (staff) to read the roster", async () => {
    await assertSucceeds(getDoc(doc(actor.teacherA(env), `schools/${SCH_A}/students/STU-1`)));
  });

  it("blocks a 'student' role account from reading the roster (the fix)", async () => {
    await assertFails(getDoc(doc(actor.studentA(env), `schools/${SCH_A}/students/STU-1`)));
  });

  it("blocks a 'parent' role account from reading the roster (the fix)", async () => {
    await assertFails(getDoc(doc(actor.parentA(env), `schools/${SCH_A}/students/STU-1`)));
  });

  it("blocks a 'student' role account from reading guardians", async () => {
    await assertFails(getDoc(doc(actor.studentA(env), `schools/${SCH_A}/guardians/GRD-1`)));
  });

  it("blocks a 'parent' role account from reading enrollments", async () => {
    await assertFails(getDoc(doc(actor.parentA(env), `schools/${SCH_A}/enrollments/E1`)));
  });

  it("blocks a plain teacher from CREATING a student (admin/head only)", async () => {
    await assertFails(
      setDoc(doc(actor.teacherA(env), `schools/${SCH_A}/students/STU-9`), {
        firstName: "N",
        status: "active",
      })
    );
  });

  it("allows a head teacher to create a student (control)", async () => {
    await assertSucceeds(
      setDoc(doc(actor.headA(env), `schools/${SCH_A}/students/STU-9`), {
        firstName: "N",
        status: "active",
      })
    );
  });

  it("blocks deleting a student (records are permanent)", async () => {
    // deleteDoc via a non-existent path still evaluates the delete rule.
    const { deleteDoc } = await import("firebase/firestore");
    await assertFails(deleteDoc(doc(actor.adminA(env), `schools/${SCH_A}/students/STU-1`)));
  });
});
