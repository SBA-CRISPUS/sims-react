import { Link } from "react-router-dom";

import { useSchools, useSetSchoolFeature } from "../hooks/schoolQueries";
import type { School } from "../types";

/**
 * Platform view for the system administrator: every registered school,
 * its subscription/status, and the paid add-on switches. Add-ons are
 * OFF by default and enabled here on a school's request (billed on top
 * of the subscription) - school admins cannot flip them themselves
 * (the features map is frozen by the security rules).
 */
export default function Schools() {
  const schools = useSchools();
  const setFeature = useSetSchoolFeature();

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Schools</h1>
          <p className="mt-1 text-gray-600">
            Schools registered on the platform, their subscription and paid
            add-ons.
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
                  <th className="p-3">Code</th>
                  <th className="p-3">District</th>
                  <th className="p-3">Ownership</th>
                  <th className="p-3">Subscription</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">SBA evidence add-on</th>
                </tr>
              </thead>
              <tbody>
                {schools.data.map((s) => (
                  <SchoolRow
                    key={s.schoolCode}
                    school={s}
                    busy={setFeature.isPending}
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
            <b>SBA evidence add-on:</b> lets the school attach photos of
            student work and marked written work (PDF) to class score sheets
            for ECZ moderation evidence. Off by default; enable on the
            school's request — it is billed in addition to the subscription.
          </p>
        </div>
      )}
    </div>
  );
}

function SchoolRow({
  school,
  busy,
  onToggleEvidence,
}: {
  school: School;
  busy: boolean;
  onToggleEvidence: (enabled: boolean) => void;
}) {
  const evidenceOn = !!school.features?.sbaEvidence;
  return (
    <tr className="border-b">
      <td className="p-3 font-medium">{school.name}</td>
      <td className="p-3 font-mono text-xs">{school.schoolCode}</td>
      <td className="p-3">{school.location?.district ?? "—"}</td>
      <td className="p-3">{school.ownership}</td>
      <td className="p-3">{school.subscription}</td>
      <td className="p-3">
        <span
          className={
            school.status === "active" ? "text-green-700" : "text-amber-700"
          }
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
          title={
            evidenceOn
              ? "Click to disable the add-on for this school"
              : "Click to enable the add-on for this school (billed extra)"
          }
        >
          {evidenceOn ? "Enabled ✓" : "Disabled"}
        </button>
      </td>
    </tr>
  );
}
