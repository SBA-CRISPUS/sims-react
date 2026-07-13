import { readFileSync } from "node:fs";

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import type { Firestore } from "firebase/firestore";
import { doc, setDoc } from "firebase/firestore";

/**
 * Shared rig for the security-rules attack panel. Every suite loads the
 * COMPILED, DEPLOYED firestore.rules (not a model of it) into the
 * emulator, so a passing panel proves the real rules behave.
 */

const [host, port] = (
  process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"
).split(":");

export async function makeEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: "sims-attack-panel",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host,
      port: Number(port),
    },
  });
}

export const SCH_A = "SCH-A";
export const SCH_B = "SCH-B";
export const SCH_C = "SCH-C";

export interface Claims {
  role: string;
  schoolCode?: string;
  employeeNumber?: string;
}

/** An authenticated Firestore handle carrying the given custom claims. */
export function as(
  env: RulesTestEnvironment,
  uid: string,
  claims: Claims
): Firestore {
  return env
    .authenticatedContext(uid, claims as Record<string, unknown>)
    .firestore();
}

export function anon(env: RulesTestEnvironment): Firestore {
  return env.unauthenticatedContext().firestore();
}

/**
 * The cast of attackers and legitimate actors. `uid`s are stable so tests
 * can assert "the same person" across self-edit scenarios.
 */
export const actor = {
  superAdmin: (env: RulesTestEnvironment) =>
    as(env, "super-uid", { role: "super_admin", schoolCode: "SYSTEM" }),
  adminA: (env: RulesTestEnvironment) =>
    as(env, "adminA-uid", { role: "school_admin", schoolCode: SCH_A }),
  headA: (env: RulesTestEnvironment) =>
    as(env, "headA-uid", { role: "head_teacher", schoolCode: SCH_A }),
  deputyA: (env: RulesTestEnvironment) =>
    as(env, "deputyA-uid", { role: "deputy_head", schoolCode: SCH_A }),
  hodA: (env: RulesTestEnvironment) =>
    as(env, "hodA-uid", { role: "hod", schoolCode: SCH_A }),
  teacherA: (env: RulesTestEnvironment) =>
    as(env, "teacherA-uid", {
      role: "teacher",
      schoolCode: SCH_A,
      employeeNumber: "TCH-A1",
    }),
  teacherA2: (env: RulesTestEnvironment) =>
    as(env, "teacherA2-uid", {
      role: "teacher",
      schoolCode: SCH_A,
      employeeNumber: "TCH-A2",
    }),
  studentA: (env: RulesTestEnvironment) =>
    as(env, "studentA-uid", { role: "student", schoolCode: SCH_A }),
  parentA: (env: RulesTestEnvironment) =>
    as(env, "parentA-uid", { role: "parent", schoolCode: SCH_A }),
  adminB: (env: RulesTestEnvironment) =>
    as(env, "adminB-uid", { role: "school_admin", schoolCode: SCH_B }),
  adminC: (env: RulesTestEnvironment) =>
    as(env, "adminC-uid", { role: "school_admin", schoolCode: SCH_C }),
};

/** Writes seed data with rules bypassed (starting state for update/read tests). */
export async function seed(
  env: RulesTestEnvironment,
  fn: (db: Firestore) => Promise<void>
): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore() as unknown as Firestore);
  });
}

/** A fully-populated school doc so entitlement-freeze tests have every
 * guarded field present to hold equal. */
export async function seedSchool(
  env: RulesTestEnvironment,
  schoolCode = SCH_A
): Promise<void> {
  await seed(env, async (db) => {
    await setDoc(doc(db, `schools/${schoolCode}`), {
      schoolCode,
      emisCode: "EMIS-1",
      name: "Test School",
      ownership: "Private",
      subscription: "Starter",
      subscriptionExpiresAt: "2026-12-31",
      status: "active",
      provisioning: "complete",
      features: {},
      policies: {},
      location: { district: "Kitwe", province: "Copperbelt" },
    });
  });
}

/** A minimally valid transfer envelope the create rule accepts. */
export function validSnapshot(): Record<string, unknown> {
  return {
    identity: {
      learnerId: null,
      studentNumber: "STU-000001",
      firstName: "Chanda",
      lastName: "Mwape",
      otherNames: null,
      gender: "M",
      dateOfBirth: "2010-05-01",
      nationality: "Zambian",
      examinationNumber: null,
    },
    enrollments: [],
    sba: [],
    guardians: [
      {
        firstName: "Grace",
        lastName: "Mwape",
        relationship: "Mother",
        phone: "0970000000",
        alternativePhone: null,
        email: null,
        address: null,
      },
    ],
    cbc: null,
  };
}
