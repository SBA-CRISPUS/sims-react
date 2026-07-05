import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useTeachers } from "../hooks/teacherQueries";
import { teacherName } from "../format";

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function TeacherDashboardPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canManage = profile?.role === "school_admin";

  const { data, isLoading, isError } = useTeachers(schoolCode);
  const teachers = useMemo(() => data ?? [], [data]);

  const count = (status: string) =>
    teachers.filter((t) => t.status === status).length;

  const recent = [...teachers]
    .sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    )
    .slice(0, 5);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teachers</h1>
          {school && <p className="mt-1 text-gray-600">{school.name}</p>}
        </div>
        <div className="flex gap-3">
          <Link
            to="/teachers/registry"
            className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-50"
          >
            View Registry
          </Link>
          {canManage && (
            <Link
              to="/teachers/register"
              className="rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800"
            >
              + Register Teacher
            </Link>
          )}
        </div>
      </div>

      {isError && (
        <p className="mt-6 text-red-600">Failed to load teachers.</p>
      )}
      {isLoading && <p className="mt-6 text-gray-500">Loading...</p>}

      {!isLoading && !isError && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label="Total Teachers" value={teachers.length} />
            <StatTile label="Active" value={count("active")} />
            <StatTile label="On Leave" value={count("on_leave")} />
            <StatTile label="Transferred" value={count("transferred")} />
          </div>

          <div className="mt-8 rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold">Recent Teachers</h2>
            {recent.length === 0 ? (
              <p className="mt-2 text-gray-500">No teachers registered yet.</p>
            ) : (
              <ul className="mt-3 divide-y">
                {recent.map((t) => (
                  <li
                    key={t.employeeNumber}
                    className="flex items-center justify-between py-2"
                  >
                    <Link
                      to={`/teachers/${t.employeeNumber}`}
                      className="text-blue-700 hover:underline"
                    >
                      {teacherName(t)}
                    </Link>
                    <span className="font-mono text-sm text-gray-500">
                      {t.employeeNumber}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
