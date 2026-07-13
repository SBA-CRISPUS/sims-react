import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";

import { actor, makeEnv, SCH_A, seed, seedSchool } from "./_helpers";

/**
 * IDENTITY & PRIVILEGE ESCALATION — the paths by which a user could grant
 * themselves a role, bind to another tenant, or defeat the forced
 * password change.
 */
describe("Identity & privilege escalation", () => {
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
      // The signed-in teacher's own profile.
      await setDoc(doc(db, "users/teacherA-uid"), {
        uid: "teacherA-uid",
        role: "teacher",
        schoolCode: SCH_A,
        employeeNumber: "TCH-A1",
        active: true,
        mustChangePassword: true,
        displayName: "Teacher A",
        email: "t@a.test",
      });
      // Another SCH-A account the admin may deactivate.
      await setDoc(doc(db, "users/other-uid"), {
        uid: "other-uid",
        role: "teacher",
        schoolCode: SCH_A,
        active: true,
        displayName: "Other",
        email: "o@a.test",
      });
      // A super_admin who happens to sit in SCH-A (admin must not touch).
      await setDoc(doc(db, "users/super-in-a"), {
        uid: "super-in-a",
        role: "super_admin",
        schoolCode: SCH_A,
        active: true,
        displayName: "Root",
        email: "r@a.test",
      });
    });
    await seedSchool(env, SCH_A);
  });

  // --- self-service escalation attempts ---
  it("blocks a user promoting themselves to super_admin", async () => {
    await assertFails(
      updateDoc(doc(actor.teacherA(env), "users/teacherA-uid"), { role: "super_admin" })
    );
  });

  it("blocks a user moving themselves to another school", async () => {
    await assertFails(
      updateDoc(doc(actor.teacherA(env), "users/teacherA-uid"), { schoolCode: "SCH-B" })
    );
  });

  it("blocks a user binding themselves to a different teacher identity", async () => {
    await assertFails(
      updateDoc(doc(actor.teacherA(env), "users/teacherA-uid"), { employeeNumber: "TCH-A9" })
    );
  });

  it("blocks a user reactivating/deactivating their own account flag", async () => {
    await assertFails(
      updateDoc(doc(actor.teacherA(env), "users/teacherA-uid"), { active: false })
    );
  });

  // --- the mustChangePassword gate (the fix under test) ---
  it("allows clearing mustChangePassword alone (the one legit self-edit)", async () => {
    await assertSucceeds(
      updateDoc(doc(actor.teacherA(env), "users/teacherA-uid"), {
        mustChangePassword: false,
      })
    );
  });

  it("blocks smuggling another field alongside mustChangePassword", async () => {
    await assertFails(
      updateDoc(doc(actor.teacherA(env), "users/teacherA-uid"), {
        mustChangePassword: false,
        role: "school_admin",
      })
    );
  });

  it("blocks smuggling a benign-looking field alongside mustChangePassword", async () => {
    await assertFails(
      updateDoc(doc(actor.teacherA(env), "users/teacherA-uid"), {
        mustChangePassword: false,
        displayName: "Renamed",
      })
    );
  });

  // --- admin managing other accounts ---
  it("allows a school admin to deactivate another account in their school", async () => {
    await assertSucceeds(
      updateDoc(doc(actor.adminA(env), "users/other-uid"), { active: false })
    );
  });

  it("blocks a school admin deactivating their OWN account", async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, "users/adminA-uid"), {
        uid: "adminA-uid",
        role: "school_admin",
        schoolCode: SCH_A,
        active: true,
        displayName: "Admin A",
        email: "a@a.test",
      });
    });
    await assertFails(
      updateDoc(doc(actor.adminA(env), "users/adminA-uid"), { active: false })
    );
  });

  it("blocks a school admin changing another account's ROLE", async () => {
    await assertFails(
      updateDoc(doc(actor.adminA(env), "users/other-uid"), { role: "head_teacher" })
    );
  });

  it("blocks a school admin deactivating a super_admin", async () => {
    await assertFails(
      updateDoc(doc(actor.adminA(env), "users/super-in-a"), { active: false })
    );
  });

  it("blocks a non-admin deactivating someone else", async () => {
    await assertFails(
      updateDoc(doc(actor.teacherA(env), "users/other-uid"), { active: false })
    );
  });

  it("blocks a school admin reaching into another school's user", async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, "users/user-in-b"), {
        uid: "user-in-b",
        role: "teacher",
        schoolCode: "SCH-B",
        active: true,
        displayName: "B",
        email: "b@b.test",
      });
    });
    await assertFails(
      updateDoc(doc(actor.adminA(env), "users/user-in-b"), { active: false })
    );
  });

  it("blocks a client creating a user profile directly (CF-only)", async () => {
    await assertFails(
      setDoc(doc(actor.adminA(env), "users/forged-uid"), {
        uid: "forged-uid",
        role: "school_admin",
        schoolCode: SCH_A,
        active: true,
      })
    );
  });
});
