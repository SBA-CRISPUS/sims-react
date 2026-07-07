import { describe, expect, it } from "vitest";

import { classStats, learnerAverage, rankPositions } from "./SbaStatsService";

describe("classStats", () => {
  it("computes count, mean (1dp), min and max", () => {
    expect(classStats([76, 85, 62])).toEqual({
      count: 3,
      mean: 74.3,
      min: 62,
      max: 85,
    });
  });

  it("is null for an empty class", () => {
    expect(classStats([])).toBeNull();
  });
});

describe("learnerAverage", () => {
  it("averages across subjects to 1dp", () => {
    expect(learnerAverage([76, 85])).toBe(80.5);
  });

  it("is null with no scored subjects", () => {
    expect(learnerAverage([])).toBeNull();
  });
});

describe("rankPositions", () => {
  it("ranks by average, highest first", () => {
    const positions = rankPositions(
      new Map([
        ["a", 60],
        ["b", 90],
        ["c", 75],
      ])
    );
    expect(positions.get("b")).toBe(1);
    expect(positions.get("c")).toBe(2);
    expect(positions.get("a")).toBe(3);
  });

  it("ties share a position and skip the next (1224)", () => {
    const positions = rankPositions(
      new Map([
        ["a", 90],
        ["b", 80],
        ["c", 80],
        ["d", 70],
      ])
    );
    expect(positions.get("a")).toBe(1);
    expect(positions.get("b")).toBe(2);
    expect(positions.get("c")).toBe(2);
    expect(positions.get("d")).toBe(4);
  });
});
