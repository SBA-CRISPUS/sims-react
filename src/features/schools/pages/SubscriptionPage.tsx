import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  useSchool,
  useUpdateEntitlements,
  useSubscriptionLedger,
  useAddSubscriptionEntry,
} from "../hooks/schoolQueries";
import type { School, SubscriptionPlan } from "../types";

const PLANS: SubscriptionPlan[] = ["Starter", "Professional", "Enterprise"];

/**
 * Dedicated subscription console for ONE school (super_admin):
 * plan, status, expiry and the append-only billing ledger. Linked from
 * the Schools table. Everything here is entitlement data the school
 * itself cannot change.
 */
export default function SubscriptionPage() {
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const school = useSchool(schoolCode);

  if (school.isLoading) {
    return <p className="p-8 text-gray-500">Loading school...</p>;
  }
  if (!school.data) {
    return (
      <div className="p-8">
        <p className="text-red-600">School {schoolCode} was not found.</p>
        <Link to="/schools" className="text-sm text-blue-700 hover:underline">
          ← Back to schools
        </Link>
      </div>
    );
  }

  return <SubscriptionConsole school={school.data} />;
}

function SubscriptionConsole({ school }: { school: School }) {
  const entitlements = useUpdateEntitlements();
  const [expiresAt, setExpiresAt] = useState(
    school.subscriptionExpiresAt ?? ""
  );

  const suspended = school.status === "suspended";
  const days = daysUntil(school.subscriptionExpiresAt);

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/schools"
            className="text-sm text-blue-700 hover:underline"
          >
            ← Schools
          </Link>
          <h1 className="mt-1 text-3xl font-bold">{school.name}</h1>
          <p className="mt-1 font-mono text-sm text-gray-500">
            {school.schoolCode} · {school.ownership} ·{" "}
            {school.location?.district ?? "—"}
          </p>
        </div>
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            suspended
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {school.status}
        </span>
      </div>

      {days !== null && (
        <p
          className={`mt-4 rounded px-4 py-2 text-sm ${
            days < 0
              ? "bg-red-50 text-red-800"
              : days <= 30
                ? "bg-amber-50 text-amber-800"
                : "bg-slate-50 text-slate-700"
          }`}
        >
          {days < 0
            ? `Subscription expired ${-days} day${days === -1 ? "" : "s"} ago.`
            : `Subscription runs until ${school.subscriptionExpiresAt} (${days} day${days === 1 ? "" : "s"} left).`}
        </p>
      )}

      {/* Entitlement controls */}
      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <h2 className="font-semibold">Subscription</h2>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-gray-600">Plan</label>
            <select
              value={school.subscription}
              disabled={entitlements.isPending}
              onChange={(e) =>
                entitlements.mutate({
                  schoolCode: school.schoolCode,
                  patch: { subscription: e.target.value as SubscriptionPlan },
                })
              }
              className="mt-1 rounded border p-2 disabled:opacity-50"
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600">Expires</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="rounded border p-2"
              />
              <button
                onClick={() =>
                  entitlements.mutate({
                    schoolCode: school.schoolCode,
                    patch: { subscriptionExpiresAt: expiresAt },
                  })
                }
                disabled={entitlements.isPending || !expiresAt}
                className="rounded bg-blue-700 px-3 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() =>
                  setExpiresAt(`${new Date().getFullYear()}-12-31`)
                }
                className="text-xs text-blue-700 hover:underline"
              >
                31 Dec (year end)
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              if (
                !suspended &&
                !window.confirm(
                  `Suspend ${school.name}? Its users will be locked out until reactivated.`
                )
              )
                return;
              entitlements.mutate({
                schoolCode: school.schoolCode,
                patch: { status: suspended ? "active" : "suspended" },
              });
            }}
            disabled={entitlements.isPending}
            className={`rounded px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              suspended
                ? "bg-green-100 text-green-800 hover:bg-green-200"
                : "bg-red-100 text-red-800 hover:bg-red-200"
            }`}
          >
            {suspended ? "Reactivate school" : "Suspend school"}
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Plan, expiry and status are platform-controlled; the school reads
          them but cannot change them. Suspension locks the school's users
          out at their next page load.
        </p>
      </div>

      {/* Billing ledger */}
      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <BillingLedger school={school} />
      </div>
    </div>
  );
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(`${iso}T23:59:59`).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
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
      setError("Say what the payment covers, e.g. 2026 academic year.");
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
        <h2 className="font-semibold">Billing ledger</h2>
        <p className="text-sm text-gray-600">
          Total received:{" "}
          <span className="font-semibold">K {total.toLocaleString()}</span>
        </p>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Append-only: corrections are new negative entries, never edits. The
        school's administrator can see this history but not change it.
      </p>

      {ledger.isLoading ? (
        <p className="mt-3 text-sm text-gray-500">Loading ledger...</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">
          No subscription payments recorded yet.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-gray-500">
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
                <tr key={e.entryId} className="border-b">
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

      <div className="mt-4 flex flex-wrap items-end gap-2">
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
            placeholder="6500"
            className="w-28 rounded border p-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Covers</label>
          <input
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="2026 academic year"
            className="w-44 rounded border p-1.5 text-sm"
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
