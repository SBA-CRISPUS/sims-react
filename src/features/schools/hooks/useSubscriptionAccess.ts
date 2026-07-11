import { useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { useSchool } from "./schoolQueries";
import {
  subscriptionState,
  daysToExpiry,
  planAtLeast,
  normalisePlan,
  GRACE_DAYS,
} from "../subscription";
import type { SubscriptionState } from "../subscription";
import type { SubscriptionPlan } from "../types";

export interface SubscriptionAccess {
  state: SubscriptionState;
  plan: SubscriptionPlan;
  /** Days until expiry (negative = past); null = no expiry configured. */
  daysToExpiry: number | null;
  /** Writes blocked: subscription lapsed past the grace period. */
  readOnly: boolean;
  /** Edition check, e.g. hasPlan("Professional"). */
  hasPlan: (required: SubscriptionPlan) => boolean;
}

/**
 * The signed-in user's subscription posture, from a FRESH school read
 * (session copy is cached at login) so a renewal recorded on the
 * platform console takes effect on the next page load. Super admins
 * and school-less sessions are never restricted. Client-side gating by
 * design - same accepted posture as the other entitlement gates.
 */
export function useSubscriptionAccess(): SubscriptionAccess {
  const { profile, school } = useAuth();
  const isPlatformAdmin = profile?.role === "super_admin";
  const fresh = useSchool(
    !isPlatformAdmin && school ? school.schoolCode : undefined
  );
  // "Today" captured once per mount (render purity).
  const [now] = useState(() => Date.now());

  const effective = fresh.data ?? school ?? undefined;
  const plan = normalisePlan(effective?.subscription);

  if (isPlatformAdmin || !effective) {
    return {
      state: "active",
      plan,
      daysToExpiry: null,
      readOnly: false,
      hasPlan: () => true,
    };
  }

  const state = subscriptionState(effective.subscriptionExpiresAt, now);
  return {
    state,
    plan,
    daysToExpiry: daysToExpiry(effective.subscriptionExpiresAt, now),
    readOnly: state === "readonly",
    hasPlan: (required) => planAtLeast(plan, required),
  };
}

export { GRACE_DAYS };
