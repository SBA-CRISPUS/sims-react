import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  useSchools,
  useSetSchoolFeature,
  useUpdateEntitlements,
  useSubscriptionLedger,
  useAddSubscriptionEntry,
} from "../hooks/schoolQueries";
import type { School, SubscriptionPlan } from "../types";

const PLANS: SubscriptionPlan[] = ["Basic", "Professional", "Enterprise"];

/**
 * Platform console for the system administrator: every registered
 * school with its subscription tier, status, paid add-ons and billing
 * ledger. Everything here is ENTITLEMENT data - the security rules
 * freeze these fields for school admins, so only this console (run as
 * super_admin) can change them. Suspending a school locks its users
 * out via the SuspensionGate until it is reactivated.
 */
export default function Schools() {
  const schools = useSchools();
  const setFeature = useSetSchoolFeature();
  const entitlements = useUpdateEntitlements();
  const [billingFor, setBillingFor] = useState<string | null>(null);

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Schools</h1>
          <p className="mt-1 text-gray-600">
            Subscriptions, status, add-ons and billing for every school on
            the platform.
          </p>
        </div>
        <Link
          to="/schools/new"
          className="rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800"
        >
          Register school
        </Link>
      </div>

      {schools.isLoading && (
        <p className="mt-6 text-gray-500">Loading schools...</p>
      )}
      {schools.isError && (
        <p className="mt-6 text-red-600">Could not load the school list.</p>
      )}

      {schools.data && (
        <div className="mt-6 overflow-x-auto rounded-lg bg-white shadow">
          {schools.data.length === 0 ? (
            <p className="p-6 text-gray-500">No schools registered yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-gray-500">
                <tr>
                  <th className="p-3">School</th>
                  <th className="p-3">District</th>
                  <th className="p-3">Subscription</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Evidence add-on</th>
                  <th className="p-3">Billing</th>
                </tr>
              </thead>
              <tbody>
                {schools.data.map((s) => (
                  <SchoolRow
                    key={s.schoolCode}
                    school={s}
                    busy={setFeature.isPending || entitlements.isPending}
                    billingOpen={billingFor === s.schoolCode}
                    onToggleBilling={() =>
                      setBillingFor((c) =>
                        c === s.schoolCode ? null : s.schoolCode
                      )
                    }
                    onPlan={(plan) =>
                      entitlements.mutate({
                        schoolCode: s.schoolCode,
                        patch: { subscription: plan },
                      })
                    }
                    onToggleStatus={() => {
                      const suspending = s.status === "active";
                      if (
                        !suspending ||
                        window.confirm(
                          `Suspend ${s.name}? Its users will be locked out until reactivated.`
                        )
                      )
                        entitlements.mutate({
                          schoolCode: s.schoolCode,
                          patch: {
                            status: suspending ? "suspended" : "active",
                          },
                        });
                    }}
                    onToggleEvidence={(enabled) =>
                      setFeature.mutate({
                        schoolCode: s.schoolCode,
                        feature: "sbaEvidence",
                        enabled,
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          )}
          <p className="p-3 text-xs text-gray-500">
            Subscription, status, add-ons and the billing ledger are
            platform-controlled — school administrators cannot change them.
            Suspending a school locks its users out at the next page load;
            the billing ledger is append-only (corrections = negative
            entries).
          </p>
        </div>
      )}
    </div>
  );
}

function SchoolRow({
  school,
  busy,
  billingOpen,
  onToggleBilling,
  onPlan,
  onToggleStatus,
  onToggleEvidence,
}: {
  school: School;
  busy: boolean;
  billingOpen: boolean;
  onToggleBilling: () => void;
  onPlan: (plan: SubscriptionPlan) => void;
  onToggleStatus: () => void;
  onToggleEvidence: (enabled: boolean) => void;
}) {
  const evidenceOn = !!school.features?.sbaEvidence;
  const suspended = school.status === "suspended";

  return (
    <>
      <tr className="border-b">
        <td className="p-3">
          <div className="font-medium">{school.name}</div>
          <div className="font-mono text-xs text-gray-400">
            {school.schoolCode} · {school.ownership}
          </div>
        </td>
        <td className="p-3">{school.location?.district ?? "—"}</td>
        <td className="p-3">
          <select
            value={school.subscription}
            disabled={busy}
            onChange={(e) => onPlan(e.target.value as SubscriptionPlan)}
            className="rounded border p-1 text-sm disabled:opacity-50"
          >
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </td>
        <td className="p-3">
          <button
            onClick={onToggleStatus}
            disabled={busy}
            className={`rounded px-3 py-1 text-xs font-medium disabled:opacity-50 ${
              suspended
                ? "bg-red-100 text-red-800 hover:bg-red-200"
                : "bg-green-100 text-green-800 hover:bg-green-200"
            }`}
            title={
              suspended
                ? "Click to reactivate the school"
                : "Click to suspend — locks the school's users out"
            }
          >
            {suspended ? "Suspended — reactivate" : school.status}
          </button>
        </td>
        <td className="p-3">
          <button
            onClick={() => onToggleEvidence(!evidenceOn)}
            disabled={busy}
            className={`rounded px-3 py-1 text-xs font-medium disabled:opacity-50 ${
              evidenceOn
                ? "bg-green-100 text-green-800 hover:bg-green-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {evidenceOn ? "Enabled ✓" : "Disabled"}
          </button>
        </td>
        <td className="p-3">
          <button
            onClick={onToggleBilling}
            className="text-sm text-blue-700 hover:underline"
          >
            {billingOpen ? "Hide ledger ▲" : "Ledger ▼"}
          </button>
        </td>
      </tr>
      {billingOpen && (
        <tr className="border-b bg-slate-50">
          <td colSpan={6} className="p-4">
            <BillingLedger school={school} />
          </td>
        </tr>
      )}
    </>
  );
}

function BillingLedger({ school }: { school: School }) {
  const { profile } = useAuth();
  const ledger = useSubscriptionLedger(school.schoolCode);
  const add = useAddSubscriptionEntry();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const entries = ledger.data ?? [];
  const total = entries.reduce((s, e) => s + e.amount, 0);

  async function submit() {
    setError(null);
    const n = Number(amount);
    if (!Number.isFinite(n) || n === 0) {
      setError("Enter a non-zero amount (negative = credit/adjustment).");
      return;
    }
    if (!period.trim()) {
      setError("Say what the payment covers, e.g. Term 1 2026.");
      return;
    }
    if (!profile) return;
    try {
      await add.mutateAsync({
        schoolCode: school.schoolCode,
        entry: {
          date,
          amount: n,
          plan: school.subscription,
          period: period.trim(),
          note: note.trim(),
        },
        actorUid: profile.uid,
      });
      setAmount("");
      setPeriod("");
      setNote("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not record the entry."
      );
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          Subscription billing — {school.name}
        </p>
        <p className="text-sm text-gray-600">
          Total received:{" "}
          <span className="font-semibold">K {total.toLocaleString()}</span>
        </p>
      </div>

      {ledger.isLoading ? (
        <p className="mt-2 text-sm text-gray-500">Loading ledger...</p>
      ) : entries.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">
          No subscription payments recorded yet.
        </p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2 text-right">Amount (K)</th>
                <th className="p-2">Plan</th>
                <th className="p-2">Covers</th>
                <th className="p-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.entryId} className="border-t">
                  <td className="p-2">{e.date}</td>
                  <td
                    className={`p-2 text-right font-medium ${
                      e.amount < 0 ? "text-red-700" : ""
                    }`}
                  >
                    {e.amount.toLocaleString()}
                  </td>
                  <td className="p-2">{e.plan}</td>
                  <td className="p-2">{e.period}</td>
                  <td className="p-2 text-gray-500">{e.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-gray-500">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border p-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Amount (K)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="2500"
            className="w-28 rounded border p-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Covers</label>
          <input
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="Term 1 2026"
            className="w-36 rounded border p-1.5 text-sm"
          />
        </div>
        <div className="min-w-40 flex-1">
          <label className="block text-xs text-gray-500">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="optional"
            className="w-full rounded border p-1.5 text-sm"
          />
        </div>
        <button
          onClick={submit}
          disabled={add.isPending}
          className="rounded bg-blue-700 px-4 py-1.5 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {add.isPending ? "Recording..." : "Record entry"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
