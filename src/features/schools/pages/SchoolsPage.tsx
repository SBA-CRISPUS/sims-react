import { Link } from "react-router-dom";

import { useState } from "react";

import {
  useSchools,
  useSetSchoolFeature,
  useUpdateEntitlements,
} from "../hooks/schoolQueries";
import { DirectoryService } from "../../../domain/schools/DirectoryService";
import type { School, SubscriptionPlan } from "../types";

const PLANS: SubscriptionPlan[] = ["Starter", "Professional", "Enterprise"];

/**
 * Platform console for the system administrator: every registered
 * school with its subscription tier, status and paid add-ons. Each
 * school's billing ledger and expiry live on its dedicated
 * Subscription page. Everything here is ENTITLEMENT data - the rules
 * freeze these fields for school admins, so only this console (run as
 * super_admin) can change them.
 */
export default function Schools() {
  const schools = useSchools();
  const setFeature = useSetSchoolFeature();
  const entitlements = useUpdateEntitlements();
  const [synced, setSynced] = useState<number | null>(null);

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Schools</h1>
          <p className="mt-1 text-gray-600">
            Subscriptions, status and add-ons for every school on the
            platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* One-time backfill of /directory for schools that predate the
              onSchoolWritten mirror; the CF keeps it fresh afterwards. */}
          <button
            onClick={async () => {
              const n = await DirectoryService.syncAll(schools.data ?? []);
              setSynced(n);
            }}
            disabled={!schools.data?.length}
            className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {synced !== null
              ? `Directory synced (${synced}) ✓`
              : "Sync transfer directory"}
          </button>
          <Link
            to="/schools/new"
            className="rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800"
          >
            Register school
          </Link>
        </div>
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
                  <th className="p-3">Plan</th>
                  <th className="p-3">Expires</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Evidence add-on</th>
                  <th className="p-3">Subscription</th>
                </tr>
              </thead>
              <tbody>
                {schools.data.map((s) => (
                  <SchoolRow
                    key={s.schoolCode}
                    school={s}
                    busy={setFeature.isPending || entitlements.isPending}
                    onPlan={(plan) =>
                      entitlements.mutate({
                        schoolCode: s.schoolCode,
                        patch: { subscription: plan },
                      })
                    }
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
            Open a school's <b>Subscription</b> page for its expiry date,
            suspension control and the append-only billing ledger. School
            administrators cannot change any of these.
          </p>
        </div>
      )}
    </div>
  );
}

function SchoolRow({
  school,
  busy,
  onPlan,
  onToggleEvidence,
}: {
  school: School;
  busy: boolean;
  onPlan: (plan: SubscriptionPlan) => void;
  onToggleEvidence: (enabled: boolean) => void;
}) {
  const evidenceOn = !!school.features?.sbaEvidence;
  const suspended = school.status === "suspended";

  return (
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
      <td className="p-3 text-sm">
        {school.subscriptionExpiresAt ?? (
          <span className="text-gray-400">not set</span>
        )}
      </td>
      <td className="p-3">
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            suspended
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {school.status}
        </span>
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
        <Link
          to={`/schools/${school.schoolCode}/subscription`}
          className="text-sm text-blue-700 hover:underline"
        >
          Manage →
        </Link>
      </td>
    </tr>
  );
}
