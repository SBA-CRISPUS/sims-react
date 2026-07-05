import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useStreams } from "../../academic/hooks/streamQueries";
import { useDepartments, useSubjects } from "../../subjects/hooks/subjectQueries";
import { useTeachingAssignments } from "../../teaching/hooks/teachingQueries";
import TeachingLoadView from "../../teaching/components/TeachingLoadView";
import {
  useTeacher,
  useCreateTeacherAccount,
  useUpdateTeacher,
} from "../hooks/teacherQueries";
import { teacherName, teacherStatusLabel } from "../format";
import TeacherEditForm from "../components/TeacherEditForm";
import type { CreateTeacherAccountResult } from "../../../domain/identity/IdentityManagementService";

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

function CredentialReveal({ result }: { result: CreateTeacherAccountResult }) {
  return (
    <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4">
      <p className="text-sm font-medium text-green-800">
        Login account created. Share these once — the password is not shown
        again.
      </p>
      <div className="mt-3 space-y-1 font-mono text-sm">
        <div>
          <span className="text-gray-500">Email: </span>
          {result.user.email}
        </div>
        <div>
          <span className="text-gray-500">Temporary password: </span>
          {result.credentials.temporaryPassword}
        </div>
      </div>
      <button
        onClick={() =>
          navigator.clipboard?.writeText(
            `Email: ${result.user.email}\nTemporary password: ${result.credentials.temporaryPassword}`
          )
        }
        className="mt-3 rounded border border-green-400 px-3 py-1.5 text-sm text-green-800 hover:bg-green-100"
      >
        Copy
      </button>
      <p className="mt-2 text-xs text-green-700">
        The teacher must change this password on first sign-in.
      </p>
    </div>
  );
}

export default function TeacherProfilePage() {
  const { employeeNumber } = useParams<{ employeeNumber: string }>();
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canManage = profile?.role === "school_admin";
  const { academicYearId, termId, academicYear, term } = useAcademicContext();

  const { data: teacher, isLoading, isError } = useTeacher(
    schoolCode,
    employeeNumber
  );
  const createAccount = useCreateTeacherAccount(schoolCode ?? "");
  const updateTeacher = useUpdateTeacher(schoolCode ?? "");
  const [credentials, setCredentials] =
    useState<CreateTeacherAccountResult | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
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

  async function handleCreateAccount() {
    if (!employeeNumber) return;
    setAccountError(null);
    setCredentials(null);
    try {
      const res = await createAccount.mutateAsync(employeeNumber);
      setCredentials(res);
    } catch (e) {
      setAccountError(
        e instanceof Error && e.message
          ? e.message
          : "Failed to create the login account."
      );
    }
  }

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
          <div className="space-y-6">
            {editing ? (
              <TeacherEditForm
                teacher={teacher}
                departments={departments.data ?? []}
                saving={updateTeacher.isPending}
                onCancel={() => setEditing(false)}
                onSubmit={async (patch) => {
                  await updateTeacher.mutateAsync({
                    employeeNumber: teacher.employeeNumber,
                    patch,
                  });
                  setEditing(false);
                }}
              />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">Details</p>
                  {canManage && (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-sm text-blue-700 hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                  <Field label="Gender" value={teacher.gender} />
                  <Field label="Phone" value={teacher.phone} />
                  <Field label="Email" value={teacher.email} />
                  <Field label="Department" value={deptName} />
                  <Field label="Employment Type" value={teacher.employmentType} />
                  <Field label="Qualification" value={teacher.qualification} />
                  <Field label="TSC Number" value={teacher.tscNumber} />
                </div>
              </>
            )}

            <div className="border-t pt-6">
              <p className="text-sm font-medium">Login account</p>
              {teacher.linkedUserUid ? (
                <p className="mt-2 text-sm text-green-700">
                  ✓ This teacher has a login account and can sign in to see
                  their own classes and enter SBA marks.
                </p>
              ) : (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    No login account yet.{" "}
                    {canManage
                      ? "Create one so the teacher can sign in and own their classes."
                      : "An administrator can create one."}
                  </p>
                  {canManage && !credentials && (
                    <button
                      onClick={handleCreateAccount}
                      disabled={
                        createAccount.isPending || teacher.status !== "active"
                      }
                      className="mt-3 rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {createAccount.isPending
                        ? "Creating…"
                        : "Create login account"}
                    </button>
                  )}
                  {teacher.status !== "active" && (
                    <p className="mt-2 text-xs text-amber-700">
                      Only an active teacher can be given an account.
                    </p>
                  )}
                  {accountError && (
                    <p className="mt-2 text-sm text-red-600">{accountError}</p>
                  )}
                  {credentials && <CredentialReveal result={credentials} />}
                </div>
              )}
            </div>
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
