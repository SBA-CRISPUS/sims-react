import { useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { useLevels } from "../../academic/hooks/streamQueries";
import {
  useSubjects,
  useDepartments,
  useCreateSubject,
  useUpdateSubject,
} from "../hooks/subjectQueries";
import type { Subject } from "../../../domain/subjects/Subject";
import SubjectForm from "../components/SubjectForm";
import type { SubjectFormValues } from "../components/SubjectForm";

export default function SubjectsPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canManage = profile?.role === "school_admin";

  const subjects = useSubjects(schoolCode);
  const departments = useDepartments(schoolCode);
  const levels = useLevels(schoolCode);
  const createSubject = useCreateSubject(schoolCode ?? "");
  const updateSubject = useUpdateSubject(schoolCode ?? "");

  const [form, setForm] = useState<{ subject?: Subject } | null>(null);

  const deptName = (id: string | null) =>
    departments.data?.find((d) => d.id === id)?.name ?? "—";

  async function handleSubmit(values: SubjectFormValues) {
    if (form?.subject) {
      await updateSubject.mutateAsync({
        subjectCode: form.subject.subjectCode,
        patch: {
          name: values.name,
          departmentId: values.departmentId,
          formsOffered: values.formsOffered,
          sbaEnabled: values.sbaEnabled,
          active: values.active,
        },
      });
    } else {
      await createSubject.mutateAsync({
        subjectCode: values.subjectCode,
        name: values.name,
        departmentId: values.departmentId,
        formsOffered: values.formsOffered,
        sbaEnabled: values.sbaEnabled,
      });
    }
    setForm(null);
  }

  const rows = subjects.data ?? [];
  const existingCodes = rows.map((s) => s.subjectCode);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subjects</h1>
          {school && <p className="mt-1 text-gray-600">{school.name}</p>}
        </div>
        {canManage && !form && (
          <button
            onClick={() => setForm({})}
            className="rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800"
          >
            + Add Subject
          </button>
        )}
      </div>

      {form && !form.subject && (
        <div className="mt-6">
          <SubjectForm
            existingCodes={existingCodes}
            departments={departments.data ?? []}
            levels={levels.data ?? []}
            onCancel={() => setForm(null)}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      <div className="mt-6 rounded-lg bg-white shadow">
        {subjects.isLoading && (
          <p className="p-6 text-gray-500">Loading subjects...</p>
        )}
        {subjects.isError && (
          <p className="p-6 text-red-600">Failed to load subjects.</p>
        )}
        {!subjects.isLoading && !subjects.isError && rows.length === 0 && (
          <p className="p-6 text-gray-500">No subjects defined yet.</p>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto print:overflow-visible"><table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-gray-500">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Name</th>
                <th className="p-3">Department</th>
                <th className="p-3">Forms</th>
                <th className="p-3">SBA</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) =>
                form?.subject?.subjectCode === s.subjectCode ? (
                  <tr key={s.subjectCode}>
                    <td colSpan={6} className="p-3">
                      <SubjectForm
                        existing={s}
                        existingCodes={existingCodes}
                        departments={departments.data ?? []}
                        levels={levels.data ?? []}
                        onCancel={() => setForm(null)}
                        onSubmit={handleSubmit}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={s.subjectCode} className="border-b">
                    <td className="p-3 font-mono">{s.subjectCode}</td>
                    <td className="p-3">{s.name}</td>
                    <td className="p-3">{deptName(s.departmentId)}</td>
                    <td className="p-3">{s.formsOffered.join(", ")}</td>
                    <td className="p-3">
                      {s.sbaEnabled ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                          enabled
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">off</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {canManage && (
                        <button
                          onClick={() => setForm({ subject: s })}
                          className="text-blue-700 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
