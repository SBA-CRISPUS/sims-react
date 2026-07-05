import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useDepartments } from "../../subjects/hooks/subjectQueries";
import { useTeacher } from "../hooks/teacherQueries";
import { teacherName, teacherStatusLabel } from "../format";

const TABS = [
  "Overview",
  "Teaching Load",
  "Subjects",
  "Classes",
  "Documents",
  "Timeline",
  "Audit",
] as const;
type Tab = (typeof TABS)[number];

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}

export default function TeacherProfilePage() {
  const { employeeNumber } = useParams<{ employeeNumber: string }>();
  const { school } = useAuth();
  const schoolCode = school?.schoolCode;

  const { data: teacher, isLoading, isError } = useTeacher(
    schoolCode,
    employeeNumber
  );
  const departments = useDepartments(schoolCode);
  const [tab, setTab] = useState<Tab>("Overview");

  if (isLoading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (isError || !teacher) {
    return (
      <div className="p-8">
        <p className="text-red-600">Teacher not found.</p>
        <Link to="/teachers" className="text-blue-700 hover:underline">
          Back to Teachers
        </Link>
      </div>
    );
  }

  const deptName =
    departments.data?.find((d) => d.id === teacher.departmentId)?.name ?? "—";

  return (
    <div className="p-8">
      <Link to="/teachers" className="text-sm text-blue-700 hover:underline">
        ← Back to Teachers
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{teacherName(teacher)}</h1>
          <p className="mt-1 font-mono text-gray-600">
            {teacher.employeeNumber}
          </p>
        </div>
        <span className="rounded bg-slate-100 px-3 py-1 text-sm">
          {teacherStatusLabel(teacher.status)}
        </span>
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap px-4 py-2 text-sm ${
              tab === t
                ? "border-b-2 border-blue-700 font-medium text-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        {tab === "Overview" ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            <Field label="Gender" value={teacher.gender} />
            <Field label="Phone" value={teacher.phone} />
            <Field label="Email" value={teacher.email} />
            <Field label="Department" value={deptName} />
            <Field label="Employment Type" value={teacher.employmentType} />
            <Field label="Qualification" value={teacher.qualification} />
            <Field label="TSC Number" value={teacher.tscNumber} />
          </div>
        ) : (
          <p className="text-gray-500">
            The {tab} tab populates once teaching assignments and documents ship
            (Sprint 5 Part 2).
          </p>
        )}
      </div>
    </div>
  );
}
