import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useDepartments } from "../../subjects/hooks/subjectQueries";
import { useTeachers } from "../hooks/teacherQueries";
import { teacherName, teacherStatusLabel } from "../format";

export default function TeacherRegistryPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canManage = profile?.role === "school_admin";

  const { data, isLoading, isError } = useTeachers(schoolCode);
  const departments = useDepartments(schoolCode);
  const [search, setSearch] = useState("");

  const deptName = (id: string | null) =>
    departments.data?.find((d) => d.id === id)?.name ?? "—";

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const teachers = data ?? [];
    if (!q) return teachers;
    return teachers.filter((t) =>
      [t.employeeNumber, teacherName(t), t.email].join(" ").toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teacher Registry</h1>
          {school && <p className="mt-1 text-gray-600">{school.name}</p>}
        </div>
        {canManage && (
          <Link
            to="/teachers/register"
            className="rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800"
          >
            + Register Teacher
          </Link>
        )}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, number or email..."
        className="mt-6 w-full max-w-md border rounded p-2"
      />

      <div className="mt-6 rounded-lg bg-white shadow">
        {isLoading && <p className="p-6 text-gray-500">Loading teachers...</p>}
        {isError && <p className="p-6 text-red-600">Failed to load teachers.</p>}
        {!isLoading && !isError && rows.length === 0 && (
          <p className="p-6 text-gray-500">No teachers found.</p>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto print:overflow-visible"><table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-gray-500">
              <tr>
                <th className="p-3">Employee No.</th>
                <th className="p-3">Name</th>
                <th className="p-3">Department</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.employeeNumber} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-mono">
                    <Link
                      to={`/teachers/${t.employeeNumber}`}
                      className="text-blue-700 hover:underline"
                    >
                      {t.employeeNumber}
                    </Link>
                  </td>
                  <td className="p-3">{teacherName(t)}</td>
                  <td className="p-3">{deptName(t.departmentId)}</td>
                  <td className="p-3">{t.employmentType}</td>
                  <td className="p-3">{teacherStatusLabel(t.status)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
