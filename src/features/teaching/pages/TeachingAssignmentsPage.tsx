import { useMemo, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useLevels, useStreams } from "../../academic/hooks/streamQueries";
import { useSubjects, useDepartments } from "../../subjects/hooks/subjectQueries";
import { useTeachers } from "../../teachers/hooks/teacherQueries";
import { teacherName } from "../../teachers/format";
import {
  useTeachingAssignments,
  useSaveAssignment,
  useDeactivateAssignment,
} from "../hooks/teachingQueries";
import AssignmentForm from "../components/AssignmentForm";

export default function TeachingAssignmentsPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canManage =
    profile?.role === "school_admin" || profile?.role === "head_teacher";

  const { academicYear, term, academicYearId, termId } = useAcademicContext();

  const assignments = useTeachingAssignments(schoolCode);
  const teachers = useTeachers(schoolCode);
  const subjects = useSubjects(schoolCode);
  const departments = useDepartments(schoolCode);
  const levels = useLevels(schoolCode);
  const streams = useStreams(schoolCode);
  const saveAssignment = useSaveAssignment(schoolCode ?? "");
  const deactivate = useDeactivateAssignment(schoolCode ?? "");

  const [showForm, setShowForm] = useState(false);

  const teacherById = useMemo(
    () => new Map((teachers.data ?? []).map((t) => [t.employeeNumber, t])),
    [teachers.data]
  );
  const subjectByCode = useMemo(
    () => new Map((subjects.data ?? []).map((s) => [s.subjectCode, s])),
    [subjects.data]
  );
  const streamById = useMemo(
    () => new Map((streams.data ?? []).map((s) => [s.streamId, s])),
    [streams.data]
  );

  const rows = useMemo(() => {
    if (!academicYearId || !termId) return [];
    return (assignments.data ?? []).filter(
      (a) =>
        a.active &&
        a.academicYearId === academicYearId &&
        a.termId === termId
    );
  }, [assignments.data, academicYearId, termId]);

  const contextReady = !!academicYearId && !!termId;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teaching Assignments</h1>
          {academicYear && term ? (
            <p className="mt-1 text-gray-600">
              {academicYear.name} · {term.name}
            </p>
          ) : (
            <p className="mt-1 text-gray-600">{school?.name}</p>
          )}
        </div>
        {canManage && contextReady && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800"
          >
            + Assign Teaching
          </button>
        )}
      </div>

      {!contextReady && (
        <p className="mt-6 text-gray-600">
          Select an academic year and term in the header bar to view and manage
          teaching assignments.
        </p>
      )}

      {contextReady && showForm && (
        <div className="mt-6">
          <AssignmentForm
            academicYearId={academicYearId!}
            termId={termId!}
            teachers={teachers.data ?? []}
            subjects={subjects.data ?? []}
            levels={levels.data ?? []}
            streams={streams.data ?? []}
            departments={departments.data ?? []}
            assignments={assignments.data ?? []}
            onCancel={() => setShowForm(false)}
            onSubmit={async (input) => {
              if (!profile) return;
              await saveAssignment.mutateAsync({
                actorUid: profile.uid,
                assignment: input,
              });
              setShowForm(false);
            }}
          />
        </div>
      )}

      {contextReady && (
        <div className="mt-6 rounded-lg bg-white shadow">
          {assignments.isLoading && (
            <p className="p-6 text-gray-500">Loading assignments...</p>
          )}
          {!assignments.isLoading && rows.length === 0 && (
            <p className="p-6 text-gray-500">
              No teaching assignments for this term yet.
            </p>
          )}
          {rows.length > 0 && (
            <div className="overflow-x-auto print:overflow-visible"><table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-gray-500">
                <tr>
                  <th className="p-3">Teacher</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Periods</th>
                  <th className="p-3">Class Teacher</th>
                  {canManage && <th className="p-3" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const t = teacherById.get(a.teacherId);
                  return (
                    <tr key={a.id} className="border-b">
                      <td className="p-3">
                        {t ? teacherName(t) : a.teacherId}
                      </td>
                      <td className="p-3">
                        {subjectByCode.get(a.subjectId)?.name ?? a.subjectId}
                      </td>
                      <td className="p-3">
                        {streamById.get(a.streamId)?.name ?? a.streamId}
                      </td>
                      <td className="p-3">{a.periodsPerWeek}</td>
                      <td className="p-3">{a.classTeacher ? "Yes" : "—"}</td>
                      {canManage && (
                        <td className="p-3 text-right">
                          <button
                            onClick={() => deactivate.mutate(a.id)}
                            disabled={deactivate.isPending}
                            className="text-red-600 hover:underline disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>
      )}
    </div>
  );
}
