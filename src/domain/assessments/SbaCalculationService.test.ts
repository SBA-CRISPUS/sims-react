import { describe, it, expect } from "vitest";

import {
  totalMaxMarks,
  obtainedTotal,
  sbaRawOutOf100,
  provisionalBand,
} from "./SbaCalculationService";
import type { SbaTask } from "./SbaPlan";

const task = (taskId: string, maxMarks: number): SbaTask => ({
  taskId,
  name: taskId,
  type: "Test",
  maxMarks,
});

describe("sbaRawOutOf100", () => {
  it("matches the ECZ worked examples (raw /100, half-up)", () => {
    // English 61/80 -> 76.25 -> 76 (guide's ×10 form: 7.625 -> 8)
    expect(sbaRawOutOf100({ t1: 61 }, [task("t1", 80)])).toBe(76);
    // Mathematics 203/240 -> 84.58 -> 85
    expect(sbaRawOutOf100({ t1: 203 }, [task("t1", 240)])).toBe(85);
    // Chemistry 85/100 -> 85
    expect(sbaRawOutOf100({ t1: 85 }, [task("t1", 100)])).toBe(85);
    // Commerce 99/120 -> 82.5 -> 83 (half rounds up)
    expect(sbaRawOutOf100({ t1: 99 }, [task("t1", 120)])).toBe(83);
  });

  it("sums obtained and max across several tasks with varying maxima", () => {
    const tasks = [task("a", 10), task("b", 20), task("c", 20)]; // max 50
    expect(sbaRawOutOf100({ a: 8, b: 16, c: 18 }, tasks)).toBe(84); // 42/50
  });

  it("treats a missing task score as zero", () => {
    const tasks = [task("a", 10), task("b", 10)];
    expect(sbaRawOutOf100({ a: 10 }, tasks)).toBe(50); // 10/20
  });

  it("guards divide-by-zero (no tasks / zero total max)", () => {
    expect(sbaRawOutOf100({}, [])).toBe(0);
    expect(sbaRawOutOf100({ a: 5 }, [task("a", 0)])).toBe(0);
  });

  it("never applies subject weighting - it returns the raw /100", () => {
    // A perfect sheet is 100 raw, not 30 or 40 (ECZ weights centrally).
    expect(sbaRawOutOf100({ a: 20 }, [task("a", 20)])).toBe(100);
  });
});

describe("totalMaxMarks / obtainedTotal", () => {
  it("sum the plan max and a learner's obtained marks", () => {
    const tasks = [task("a", 10), task("b", 20)];
    expect(totalMaxMarks(tasks)).toBe(30);
    expect(obtainedTotal({ a: 7, b: 15 }, tasks)).toBe(22);
    expect(obtainedTotal({ a: 7 }, tasks)).toBe(7);
  });
});

describe("provisionalBand", () => {
  it("maps a raw % to the ECZ competency band at each cut-off", () => {
    expect(provisionalBand(100)).toBe("Outstanding");
    expect(provisionalBand(70)).toBe("Outstanding");
    expect(provisionalBand(69)).toBe("Advanced");
    expect(provisionalBand(60)).toBe("Advanced");
    expect(provisionalBand(59)).toBe("Basic");
    expect(provisionalBand(50)).toBe("Basic");
    expect(provisionalBand(49)).toBe("Satisfactory");
    expect(provisionalBand(40)).toBe("Satisfactory");
    expect(provisionalBand(39)).toBe("Unsatisfactory");
    expect(provisionalBand(0)).toBe("Unsatisfactory");
  });
});
