import { describe, expect, it } from "vitest";

import {
  weightedSba,
  subjectWeightPercent,
  DEFAULT_SBA_WEIGHT_PERCENT,
} from "./SbaWeighting";

describe("weightedSba", () => {
  it("converts a raw /100 mark to its 30% contribution", () => {
    expect(weightedSba(76)).toBe(22.8);
    expect(weightedSba(85)).toBe(25.5);
    expect(weightedSba(100)).toBe(30);
    expect(weightedSba(0)).toBe(0);
  });

  it("supports the 40% practical weighting (PE and Sport)", () => {
    expect(weightedSba(76, 40)).toBe(30.4);
    expect(weightedSba(100, 40)).toBe(40);
  });

  it("stays exact to two decimal places", () => {
    expect(weightedSba(77)).toBe(23.1);
    expect(weightedSba(33)).toBe(9.9);
  });
});

describe("subjectWeightPercent", () => {
  it("defaults to 30 when unset or invalid", () => {
    expect(subjectWeightPercent(undefined)).toBe(DEFAULT_SBA_WEIGHT_PERCENT);
    expect(subjectWeightPercent({})).toBe(30);
    expect(subjectWeightPercent({ sbaWeightPercent: 0 })).toBe(30);
    expect(subjectWeightPercent({ sbaWeightPercent: 150 })).toBe(30);
  });

  it("honours a subject override", () => {
    expect(subjectWeightPercent({ sbaWeightPercent: 40 })).toBe(40);
  });
});
