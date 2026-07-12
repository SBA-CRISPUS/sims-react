import { useSubscriptionAccess, GRACE_DAYS } from "../hooks/useSubscriptionAccess";

/**
 * Global renewal strip under the header: warns ahead of expiry, shouts
 * during grace, and explains read-only mode once grace runs out.
 * Renders nothing while the subscription is comfortably active.
 */
export default function SubscriptionBanner() {
  const { state, daysToExpiry } = useSubscriptionAccess();

  if (state === "readonly") {
    return (
      <p className="bg-red-100 px-4 py-1.5 text-center text-sm text-red-800 print:hidden">
        <b>Read-only mode:</b> the school's SIMS subscription has lapsed.
        Records can be viewed, printed and exported, but nothing new can be
        recorded until the subscription is renewed. Your data is safe.
      </p>
    );
  }

  if (state === "grace") {
    const graceLeft =
      daysToExpiry === null ? GRACE_DAYS : GRACE_DAYS + daysToExpiry;
    return (
      <p className="bg-amber-100 px-4 py-1.5 text-center text-sm text-warn-ink print:hidden">
        <b>Subscription expired.</b> Full access continues for{" "}
        {graceLeft} more day{graceLeft === 1 ? "" : "s"} — please ask your
        administrator to renew before SIMS switches to read-only.
      </p>
    );
  }

  if (daysToExpiry !== null && daysToExpiry <= 30) {
    return (
      <p className="bg-slate-800 px-4 py-1.5 text-center text-sm text-white print:hidden">
        The school's SIMS subscription expires in {daysToExpiry} day
        {daysToExpiry === 1 ? "" : "s"} — renew to avoid interruption.
      </p>
    );
  }

  return null;
}
