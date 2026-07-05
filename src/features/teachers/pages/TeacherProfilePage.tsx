import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useStreams } from "../../academic/hooks/streamQueries";
import { useDepartments, useSubjects } from "../../subjects/hooks/subjectQueries";
import { useTeachingAssignments } from "../../teaching/hooks/teachingQueries";
import TeachingLoadView from "../../teaching/components/TeachingLoadView";
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
  const { academicYearId, termId, academicYear, term } = useAcademicContext();

  const { data: teacher, isLoading, isError } = useTeacher(
    schoolCode,
    employeeNumber
  );
  const departments = useDepartments(schoolCode);
  const subjects = useSubjects(schoolCode);
  const streams = useStreams(schoolCode);
  const assignmentsQuery = useTeachingAssignments(schoolCode);
  const [tab, setTab] = useState<Tab>("Overview");

  const subjectByCode = useMemo(
    () => new Map((subjects.data ?? []).map((s) => [s.subjectCode, s])),
    [subjects.data]
  );
  const streamById = useMemo(
    () => new Map((streams.data ?? []).map((s) => [s.streamId, s])),
    [streams.data]
  );

  // The teacher's active assignments in the current academic context.
  const assignments = useMemo(() => {
    return (assignmentsQuery.data ?? []).filter(
      (a) =>
        a.active &&
        a.teacherId === employeeNumber &&
        (!academicYearId || a.academicYearId === academicYearId) &&
        (!termId || a.termId === termId)
    );
  }, [assignmentsQuery.data, employeeNumber, academicYearId, termId]);

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

  const distinctSubjects = [...new Set(assignments.map((a) => a.subjectId))];
  const distinctClasses = [...new Set(assignments.map((a) => a.streamId))];

  const contextLabel =
    academicYear && term ? ` (${academicYear.name} · ${term.name})` : "";

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
        {tab === "Overview" && (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            <Field label="Gender" value={teacher.gender} />
            <Field label="Phone" value={teacher.phone} />
            <Field label="Email" value={teacher.email} />
            <Field label="Department" value={deptName} />
            <Field label="Employment Type" value={teacher.employmentType} />
            <Field label="Qualification" value={teacher.qualification} />
            <Field label="TSC Number" value={teacher.tscNumber} />
          </div>
        )}

        {tab === "Teaching Load" && (
          <>
            <p className="mb-4 text-sm text-gray-500">Teaching load{contextLabel}</p>
            <TeachingLoadView
              assignments={assignments}
              subjectByCode={subjectByCode}
              streamById={streamById}
            />
          </>
        )}

        {tab === "Subjects" &&
          (distinctSubjects.length === 0 ? (
            <p className="text-gray-500">No subjects assigned.</p>
          ) : (
            <ul className="list-disc pl-6">
              {distinctSubjects.map((code) => (
                <li key={code}>{subjectByCode.get(code)?.name ?? code}</li>
              ))}
            </ul>
          ))}

        {tab === "Classes" &&
          (distinctClasses.length === 0 ? (
            <p className="text-gray-500">No classes assigned.</p>
          ) : (
            <ul className="list-disc pl-6">
              {distinctClasses.map((id) => (
                <li key={id}>{streamById.get(id)?.name ?? id}</li>
              ))}
            </ul>
          ))}

        {(tab === "Documents" || tab === "Timeline" || tab === "Audit") && (
          <p className="text-gray-500">
            The {tab} tab is coming in a later sprint.
          </p>
        )}
      </div>
    </div>
  );
}
