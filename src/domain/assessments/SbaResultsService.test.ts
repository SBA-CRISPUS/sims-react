import { describe, it, expect } from "vitest";

import {
  resultFor,
  combinedOutOf20,
  classStage,
  rollUp,
} from "./SbaResultsService";
import type { SbaTask, SbaPlan } from "./SbaPlan";
import type { SbaMark } from "./SbaMark";

const task = (taskId: string, maxMarks: number): SbaTask => ({
  taskId,
  name: taskId,
  type: "Test",
  maxMarks,
});

const plan = (tasks: SbaTask[]): SbaPlan => ({
  planId: "AY-2026_F2_MATH",
  academicYearId: "AY-2026",
  academicLevelCode: "F2",
  subjectId: "MATH",
  subjectName: "Mathematics",
  tasks,
  totalMaxMarks: tasks.reduce((s, t) => s + t.maxMarks, 0),
  status: "published",
  createdByUid: "u1",
});

const mark = (over: Partial<SbaMark>): SbaMark => ({
  id: "AY-2026_F2-A_MATH_STU-1",
  submissionId: "AY-2026_F2-A_MATH",
  planId: "AY-2026_F2_MATH",
  academicYearId: "AY-2026",
  academicLevelCode: "F2",
  streamId: "F2-A",
  subjectId: "MATH",
  studentId: "STU-1",
  taskScores: {},
  status: "submitted",
  lastActionByUid: "u1",
  createdByUid: "u1",
  ...over,
});

describe("resultFor", () => {
  const p = plan([task("a", 50), task("b", 50)]); // max 100

  it("computes live from taskScores + plan when not frozen", () => {
    const r = resultFor(mark({ taskScores: { a: 40, b: 40 } }), p);
    expect(r).not.toBeNull();
    expect(r!.raw).toBe(80);
    expect(r!.frozen).toBe(false);
    expect(r!.band).toBe("Outstanding");
  });

  it("uses the frozen rawScore once approved (ignores taskScores)", () => {
    const r = resultFor(
      mark({ taskScores: { a: 0, b: 0 }, rawScore: 73, status: "approved" }),
      p
    );
    expect(r!.raw).toBe(73);
    expect(r!.frozen).toBe(true);
    expect(r!.band).toBe("Outstanding");
  });

  it("returns null for a not-taking learner", () => {
    expect(resultFor(mark({ notTaking: true }), p)).toBeNull();
  });
});

describe("combinedOutOf20", () => {
  it("sums Form 2 + Form 3, each scaled to /10", () => {
    expect(combinedOutOf20(76, 85)).toBe(17); // round(7.6)=8 + round(8.5)=9
    expect(combinedOutOf20(80, null)).toBe(8);
    expect(combinedOutOf20(null, null)).toBeNull();
  });
});

describe("SBA readiness pipeline", () => {
  it("classStage maps a plan + submission status to a stage", () => {
    expect(classStage(false)).toBe("planning");
    expect(classStage(true, undefined)).toBe("entry");
    expect(classStage(true, "draft")).toBe("entry");
    expect(classStage(true, "returned")).toBe("entry");
    expect(classStage(true, "submitted")).toBe("submitted");
    expect(classStage(true, "moderated")).toBe("moderated");
    expect(classStage(true, "approved")).toBe("approved");
    expect(classStage(true, "locked")).toBe("approved");
  });

  it("rollUp headlines the least-advanced class and averages progress", () => {
    expect(rollUp([])).toEqual({ stage: "planning", progress: 0 });
    expect(rollUp(["approved", "approved"])).toEqual({
      stage: "approved",
      progress: 100,
    });
    // weights 1 (entry) + 4 (approved) -> avg 2.5 / 4 = 62.5 -> 63
    const r = rollUp(["entry", "approved"]);
    expect(r.stage).toBe("entry");
    expect(r.progress).toBe(63);
  });
});
