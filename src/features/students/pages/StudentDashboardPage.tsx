import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useRegistry } from "../hooks/studentQueries";
import { StudentRegistryService } from "../../../domain/students/StudentRegistryService";
import { fullName, formatDate } from "../format";
import StatTile from "../components/StatTile";
import CountBars from "../components/CountBars";

export default function StudentDashboardPage() {
  const { school } = useAuth();
  const schoolCode = school?.schoolCode;

  const { data, isLoading, isError } = useRegistry(schoolCode);

  const rows = useMemo(() => data ?? [], [data]);
  const stats = useMemo(
    () => StudentRegistryService.computeStats(rows),
    [rows]
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          {school && <p className="mt-1 text-gray-600">{school.name}</p>}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/students/admit"
            className="rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800"
          >
            + Admit Student
          </Link>
          <Link
            to="/students/registry"
            className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-50"
          >
            View Registry
          </Link>
          <button
            onClick={() => StudentRegistryService.exportCsv(rows)}
            disabled={rows.length === 0}
            className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-50 disabled:opacity-40"
          >
            Export Registry
          </button>
          <button
            disabled
            title="Import is not available yet"
            className="rounded border border-slate-300 px-4 py-2 opacity-40"
          >
            Import Students
          </button>
        </div>
      </div>

      {isError && (
        <p className="mt-6 text-red-600">Failed to load student data.</p>
      )}
      {isLoading && <p className="mt-6 text-gray-500">Loading dashboard...</p>}

      {!isLoading && !isError && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatTile label="Total Students" value={stats.total} />
            <StatTile
              label="New Admissions (This Month)"
              value={stats.admittedThisMonth}
            />
            <StatTile label="Active" value={stats.active} />
            <StatTile label="Graduated" value={stats.graduated} />
            <StatTile label="Transfers" value={stats.transferred} />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <CountBars title="Enrollment by Form" items={stats.byLevel} />
            <CountBars title="Enrollment by Stream" items={stats.byStream} />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <CountBars
              title="Gender"
              items={[
                { key: "Male", count: stats.male },
                { key: "Female", count: stats.female },
              ]}
            />

            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold">Recent Admissions</h2>
              {stats.recent.length === 0 ? (
                <p className="mt-3 text-gray-500">No admissions yet.</p>
              ) : (
                <ul className="mt-3 divide-y">
                  {stats.recent.map(({ student }) => (
                    <li
                      key={student.studentNumber}
                      className="flex items-center justify-between py-2"
                    >
                      <Link
                        to={`/students/${student.studentNumber}`}
                        className="text-blue-700 hover:underline"
                      >
                        {fullName(student)}
                      </Link>
                      <span className="text-sm text-gray-500">
                        {formatDate(student.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
