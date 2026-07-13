import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";

import { actor, makeEnv, SCH_A, seed } from "./_helpers";

const YEAR = "AY-2026";
const STREAM = "F2-A";
const SUBJ = "MATH";
const STU = "STU-1";
const MARK_ID = `${YEAR}_${STREAM}_${SUBJ}_${STU}`;
const SUB_ID = `${YEAR}_${STREAM}_${SUBJ}`;
const PLAN_ID = `${YEAR}_F2_${SUBJ}`;

function markBase(extra: Record<string, unknown>) {
  return {
    id: MARK_ID,
    academicYearId: YEAR,
    academicLevelCode: "F2",
    streamId: STREAM,
    subjectId: SUBJ,
    studentId: STU,
    planId: PLAN_ID,
    submissionId: SUB_ID,
    taskScores: {},
    ...extra,
  };
}

function subBase(extra: Record<string, unknown>) {
  return {
    submissionId: SUB_ID,
    planId: PLAN_ID,
    academicYearId: YEAR,
    academicLevelCode: "F2",
    streamId: STREAM,
    subjectId: SUBJ,
    teacherId: "TCH-A1",
    ...extra,
  };
}

/**
 * SBA WORKFLOW — assignment ownership, the submit → moderate → approve
 * chain, and the immutability of approved marks + CF-only frozen totals.
 */
describe("SBA marks: ownership & frozen totals", () => {
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

  it("allows the OWNING teacher to create their slot's mark", async () => {
    await assertSucceeds(
      setDoc(
        doc(actor.teacherA(env), `schools/${SCH_A}/sbaMarks/${MARK_ID}`),
        markBase({
          createdByUid: "teacherA-uid",
          lastActionByUid: "teacherA-uid",
          status: "draft",
          teacherId: "TCH-A1",
        })
      )
    );
  });

  it("blocks a teacher scoring a slot owned by ANOTHER teacher", async () => {
    await assertFails(
      setDoc(
        doc(actor.teacherA(env), `schools/${SCH_A}/sbaMarks/${MARK_ID}`),
        markBase({
          createdByUid: "teacherA-uid",
          lastActionByUid: "teacherA-uid",
          status: "draft",
          teacherId: "TCH-A2", // not this teacher's slot
        })
      )
    );
  });

  it("allows an assessment manager (admin) to score any slot", async () => {
    await assertSucceeds(
      setDoc(
        doc(actor.adminA(env), `schools/${SCH_A}/sbaMarks/${MARK_ID}`),
        markBase({
          createdByUid: "adminA-uid",
          lastActionByUid: "adminA-uid",
          status: "draft",
          teacherId: "TCH-A2",
        })
      )
    );
  });

  it("blocks setting the CF-only frozen totals at create", async () => {
    await assertFails(
      setDoc(
        doc(actor.adminA(env), `schools/${SCH_A}/sbaMarks/${MARK_ID}`),
        markBase({
          createdByUid: "adminA-uid",
          lastActionByUid: "adminA-uid",
          status: "draft",
          teacherId: "TCH-A1",
          obtainedTotal: 40,
          rawScore: 80,
        })
      )
    );
  });

  it("blocks editing the frozen totals of an APPROVED mark", async () => {
    await seed(env, async (db) => {
      await setDoc(
        doc(db, `schools/${SCH_A}/sbaMarks/${MARK_ID}`),
        markBase({
          createdByUid: "teacherA-uid",
          lastActionByUid: "headA-uid",
          status: "approved",
          teacherId: "TCH-A1",
          obtainedTotal: 40,
          rawScore: 80,
        })
      );
    });
    await assertFails(
      updateDoc(doc(actor.adminA(env), `schools/${SCH_A}/sbaMarks/${MARK_ID}`), {
        rawScore: 100,
        lastActionByUid: "adminA-uid",
      })
    );
  });

  it("blocks editing the SCORES of an approved mark (terminal)", async () => {
    await seed(env, async (db) => {
      await setDoc(
        doc(db, `schools/${SCH_A}/sbaMarks/${MARK_ID}`),
        markBase({
          createdByUid: "teacherA-uid",
          lastActionByUid: "headA-uid",
          status: "approved",
          teacherId: "TCH-A1",
          obtainedTotal: 40,
          rawScore: 80,
        })
      );
    });
    await assertFails(
      updateDoc(doc(actor.teacherA(env), `schools/${SCH_A}/sbaMarks/${MARK_ID}`), {
        taskScores: { t1: 99 },
        lastActionByUid: "teacherA-uid",
      })
    );
  });

  it("blocks reassigning a mark's teacherId on update", async () => {
    await seed(env, async (db) => {
      await setDoc(
        doc(db, `schools/${SCH_A}/sbaMarks/${MARK_ID}`),
        markBase({
          createdByUid: "teacherA-uid",
          lastActionByUid: "teacherA-uid",
          status: "draft",
          teacherId: "TCH-A1",
        })
      );
    });
    await assertFails(
      updateDoc(doc(actor.teacherA(env), `schools/${SCH_A}/sbaMarks/${MARK_ID}`), {
        teacherId: "TCH-A2",
        lastActionByUid: "teacherA-uid",
      })
    );
  });
});

describe("SBA submission: the approval chain", () => {
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

  async function seedSubmission(status: string) {
    await seed(env, async (db) => {
      await setDoc(
        doc(db, `schools/${SCH_A}/sbaSubmissions/${SUB_ID}`),
        subBase({ status, createdByUid: "teacherA-uid", lastActionByUid: "teacherA-uid" })
      );
    });
  }

  it("allows the owning teacher to submit a draft", async () => {
    await seedSubmission("draft");
    await assertSucceeds(
      updateDoc(doc(actor.teacherA(env), `schools/${SCH_A}/sbaSubmissions/${SUB_ID}`), {
        status: "submitted",
        lastActionByUid: "teacherA-uid",
      })
    );
  });

  it("blocks a NON-owning teacher from submitting someone else's sheet", async () => {
    await seedSubmission("draft");
    await assertFails(
      updateDoc(doc(actor.teacherA2(env), `schools/${SCH_A}/sbaSubmissions/${SUB_ID}`), {
        status: "submitted",
        lastActionByUid: "teacherA2-uid",
      })
    );
  });

  it("allows a HOD to moderate a submitted sheet", async () => {
    await seedSubmission("submitted");
    await assertSucceeds(
      updateDoc(doc(actor.hodA(env), `schools/${SCH_A}/sbaSubmissions/${SUB_ID}`), {
        status: "moderated",
        lastActionByUid: "hodA-uid",
      })
    );
  });

  it("blocks a teacher from moderating", async () => {
    await seedSubmission("submitted");
    await assertFails(
      updateDoc(doc(actor.teacherA(env), `schools/${SCH_A}/sbaSubmissions/${SUB_ID}`), {
        status: "moderated",
        lastActionByUid: "teacherA-uid",
      })
    );
  });

  it("allows the head teacher to approve", async () => {
    await seedSubmission("submitted");
    await assertSucceeds(
      updateDoc(doc(actor.headA(env), `schools/${SCH_A}/sbaSubmissions/${SUB_ID}`), {
        status: "approved",
        lastActionByUid: "headA-uid",
      })
    );
  });

  it("blocks a HOD from approving (moderate only)", async () => {
    await seedSubmission("submitted");
    await assertFails(
      updateDoc(doc(actor.hodA(env), `schools/${SCH_A}/sbaSubmissions/${SUB_ID}`), {
        status: "approved",
        lastActionByUid: "hodA-uid",
      })
    );
  });

  it("blocks a teacher from approving their own sheet", async () => {
    await seedSubmission("submitted");
    await assertFails(
      updateDoc(doc(actor.teacherA(env), `schools/${SCH_A}/sbaSubmissions/${SUB_ID}`), {
        status: "approved",
        lastActionByUid: "teacherA-uid",
      })
    );
  });

  it("blocks skipping the queue: draft straight to approved", async () => {
    await seedSubmission("draft");
    await assertFails(
      updateDoc(doc(actor.headA(env), `schools/${SCH_A}/sbaSubmissions/${SUB_ID}`), {
        status: "approved",
        lastActionByUid: "headA-uid",
      })
    );
  });

  it("blocks reassigning teacherId during a transition", async () => {
    await seedSubmission("submitted");
    await assertFails(
      updateDoc(doc(actor.headA(env), `schools/${SCH_A}/sbaSubmissions/${SUB_ID}`), {
        status: "approved",
        teacherId: "TCH-A2",
        lastActionByUid: "headA-uid",
      })
    );
  });
});

describe("SBA plans", () => {
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

  it("blocks a teacher from creating an assessment plan", async () => {
    await assertFails(
      setDoc(doc(actor.teacherA(env), `schools/${SCH_A}/sbaPlans/${PLAN_ID}`), {
        planId: PLAN_ID,
        academicYearId: YEAR,
        academicLevelCode: "F2",
        subjectId: SUBJ,
        createdByUid: "teacherA-uid",
        status: "draft",
        tasks: [],
      })
    );
  });

  it("blocks creating a plan for a non-SBA form (F1)", async () => {
    const F1_PLAN = `${YEAR}_F1_${SUBJ}`;
    await assertFails(
      setDoc(doc(actor.adminA(env), `schools/${SCH_A}/sbaPlans/${F1_PLAN}`), {
        planId: F1_PLAN,
        academicYearId: YEAR,
        academicLevelCode: "F1",
        subjectId: SUBJ,
        createdByUid: "adminA-uid",
        status: "draft",
        tasks: [],
      })
    );
  });

  it("allows an admin to create a valid F2 plan (control)", async () => {
    await assertSucceeds(
      setDoc(doc(actor.adminA(env), `schools/${SCH_A}/sbaPlans/${PLAN_ID}`), {
        planId: PLAN_ID,
        academicYearId: YEAR,
        academicLevelCode: "F2",
        subjectId: SUBJ,
        createdByUid: "adminA-uid",
        status: "draft",
        tasks: [],
      })
    );
  });

  it("blocks editing the tasks of a PUBLISHED plan", async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, `schools/${SCH_A}/sbaPlans/${PLAN_ID}`), {
        planId: PLAN_ID,
        academicYearId: YEAR,
        academicLevelCode: "F2",
        subjectId: SUBJ,
        createdByUid: "adminA-uid",
        status: "published",
        tasks: [{ name: "Test 1", maxMarks: 20 }],
      });
    });
    await assertFails(
      updateDoc(doc(actor.adminA(env), `schools/${SCH_A}/sbaPlans/${PLAN_ID}`), {
        tasks: [{ name: "Tampered", maxMarks: 100 }],
      })
    );
  });

  it("allows unpublishing a plan back to draft (status-only)", async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, `schools/${SCH_A}/sbaPlans/${PLAN_ID}`), {
        planId: PLAN_ID,
        academicYearId: YEAR,
        academicLevelCode: "F2",
        subjectId: SUBJ,
        createdByUid: "adminA-uid",
        status: "published",
        tasks: [{ name: "Test 1", maxMarks: 20 }],
      });
    });
    await assertSucceeds(
      updateDoc(doc(actor.adminA(env), `schools/${SCH_A}/sbaPlans/${PLAN_ID}`), {
        status: "draft",
      })
    );
  });
});
