import { describe, expect, it } from "vitest";

import {
  subscriptionState,
  daysToExpiry,
  planAtLeast,
  normalisePlan,
  GRACE_DAYS,
} from "./subscription";

const DAY = 86_400_000;
const now = new Date("2026-07-15T10:00:00").getTime();

describe("subscriptionState", () => {
  it("is active with no expiry configured", () => {
    expect(subscriptionState(undefined, now)).toBe("active");
    expect(subscriptionState("not-a-date", now)).toBe("active");
  });

  it("is active until the end of the expiry day", () => {
    expect(subscriptionState("2026-07-15", now)).toBe("active");
    expect(subscriptionState("2026-12-31", now)).toBe("active");
  });

  it("enters grace the day after expiry, for GRACE_DAYS days", () => {
    expect(subscriptionState("2026-07-14", now)).toBe("grace");
    const graceEnd = new Date(
      new Date("2026-07-14T23:59:59").getTime() + GRACE_DAYS * DAY
    );
    expect(subscriptionState("2026-07-14", graceEnd.getTime() - DAY)).toBe(
      "grace"
    );
  });

  it("turns read-only once grace runs out", () => {
    const afterGrace =
      new Date("2026-07-14T23:59:59").getTime() + (GRACE_DAYS + 1) * DAY;
    expect(subscriptionState("2026-07-14", afterGrace)).toBe("readonly");
  });
});

describe("daysToExpiry", () => {
  it("counts down to the expiry date", () => {
    expect(daysToExpiry("2026-07-16", now)).toBe(2);
    expect(daysToExpiry("2026-07-15", now)).toBe(1);
    // Expired end of the 13th; by the 15th we are in grace day 2.
    expect(daysToExpiry("2026-07-13", now)).toBe(-2);
    expect(daysToExpiry("2026-07-14", now)).toBe(-1);
    expect(daysToExpiry(undefined, now)).toBeNull();
  });
});

describe("planAtLeast / normalisePlan", () => {
  it("orders Starter < Professional < Enterprise", () => {
    expect(planAtLeast("Starter", "Professional")).toBe(false);
    expect(planAtLeast("Professional", "Professional")).toBe(true);
    expect(planAtLeast("Enterprise", "Professional")).toBe(true);
    expect(planAtLeast("Starter", "Starter")).toBe(true);
  });

  it("maps legacy Basic to Starter", () => {
    expect(normalisePlan("Basic")).toBe("Starter");
    expect(normalisePlan("Enterprise")).toBe("Enterprise");
    expect(normalisePlan(undefined)).toBe("Professional");
  });
});
