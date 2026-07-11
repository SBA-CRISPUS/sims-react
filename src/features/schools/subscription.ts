import type { School, SubscriptionPlan } from "./types";

/**
 * The subscription lifecycle (mentor's model, adopted 2026-07):
 *
 *   active ──expiry──▶ grace (30 days, full access + renewal banner)
 *          ──grace ends──▶ readonly (view/print/export OK; admitting,
 *          marks entry, transfers and other writes blocked)
 *          ──renewal (new expiry date)──▶ active
 *
 * Read-only is deliberately NOT suspension: suspension stays the
 * platform's manual lever for abuse; a lapsed subscription never hides
 * a school's own data from it. No expiry date set = active (schools
 * provisioned before this model, or comped).
 */
export type SubscriptionState = "active" | "grace" | "readonly";

export const GRACE_DAYS = 30;

/** Starter is capped; Professional/Enterprise are unlimited. */
export const STARTER_STUDENT_LIMIT = 300;

const PLAN_ORDER: Record<SubscriptionPlan, number> = {
  Starter: 0,
  Professional: 1,
  Enterprise: 2,
};

export function subscriptionState(
  expiresAt: string | undefined,
  now: number
): SubscriptionState {
  const days = daysToExpiry(expiresAt, now);
  if (days === null || days >= 0) return "active";
  if (-days <= GRACE_DAYS) return "grace";
  return "readonly";
}

/** Days until the end of the expiry date (>= 0 while active), or the
 * grace-day count as a negative number once past (-1 on the first day
 * after expiry). null = no expiry configured (treated as active). */
export function daysToExpiry(
  expiresAt: string | undefined,
  now: number
): number | null {
  if (!expiresAt) return null;
  const t = new Date(`${expiresAt}T23:59:59`).getTime();
  if (Number.isNaN(t)) return null;
  const DAY = 86_400_000;
  // Split at the expiry instant: ceil on both sides so the state flips
  // the moment the expiry day ends (a plain ceil of the difference
  // would call "expired 10 hours ago" day 0 and keep it active).
  return t >= now ? Math.ceil((t - now) / DAY) : -Math.ceil((now - t) / DAY);
}

/** Edition gating: does the school's plan include tier `required`? */
export function planAtLeast(
  plan: SubscriptionPlan | undefined,
  required: SubscriptionPlan
): boolean {
  // Unknown/legacy plan values fail open at Professional level - never
  // brick a paying school over a data quirk.
  const p = plan && plan in PLAN_ORDER ? PLAN_ORDER[plan] : 1;
  return p >= PLAN_ORDER[required];
}

/** Legacy tier name: "Basic" became "Starter" (2026-07). Normalised on
 * every read so old school docs keep working without a migration. */
export function normalisePlan(plan: unknown): SubscriptionPlan {
  if (plan === "Basic") return "Starter";
  if (plan === "Starter" || plan === "Professional" || plan === "Enterprise")
    return plan;
  return "Professional";
}

export function normaliseSchool(school: School): School {
  return { ...school, subscription: normalisePlan(school.subscription) };
}
