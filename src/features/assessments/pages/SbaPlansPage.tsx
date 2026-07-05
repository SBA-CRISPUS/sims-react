import { useMemo, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import {
  useLevels,
  useTerms,
} from "../../academic/hooks/streamQueries";
import { useSubjects } from "../../subjects/hooks/subjectQueries";
import { useSbaPlans, useSavePlan, useSetPlanStatus } from "../hooks/sbaQueries";
import type { SbaPlan } from "../../../domain/assessments/SbaPlan";
import PlanBuilder from "../components/PlanBuilder";

const MANAGER_ROLES = ["school_admin", "head_teacher", "hod"];

export default function SbaPlansPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canManage = MANAGER_ROLES.includes(profile?.role ?? "");

  const { academicYear, academicYearId } = useAcademicContext();

  const plans = useSbaPlans(schoolCode);
  const subjects = useSubjects(schoolCode);
  const levels = useLevels(schoolCode);
  const terms = useTerms(schoolCode, academicYearId);
  const savePlan = useSavePlan(schoolCode ?? "");
  const setStatus = useSetPlanStatus(schoolCode ?? "");

  // null = closed, {} = new plan, { plan } = editing that plan.
  const [form, setForm] = useState<{ plan?: SbaPlan } | null>(null);

  const yearPlans = useMemo(() => {
    if (!academicYearId) return [];
    return (plans.data ?? [])
      .filter((p) => p.academicYearId === academicYearId)
      .sort(
        (a, b) =>
          a.academicLevelCode.localeCompare(b.academicLevelCode) ||
          a.subjectName.localeCompare(b.subjectName)
      );
  }, [plans.data, academicYearId]);

  const existingPlanIds = (plans.data ?? []).map((p) => p.planId);
  const contextReady = !!academicYearId;

  async function handleSubmit(input: Parameters<typeof savePlan.mutateAsync>[0]["plan"]) {
    if (!profile) return;
    await savePlan.mutateAsync({ actorUid: profile.uid, plan: input });
    setForm(null);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SBA Plans</h1>
          {academicYear ? (
            <p className="mt-1 text-gray-600">
              {academicYear.name} · assessment task structure per subject
            </p>
          ) : (
            <p className="mt-1 text-gray-600">{school?.name}</p>
          )}
        </div>
        {canManage && contextReady && !form && (
          <button
            onClick={() => setForm({})}
            className="rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800"
          >
            + New Plan
          </button>
        )}
      </div>

      <p className="mt-2 max-w-3xl text-sm text-gray-500">
        A plan is a subject's list of SBA tasks for a form-year (Form 2 or Form
        3). Marks entered against these tasks are combined as{" "}
        <span className="font-medium">raw ÷ total × 100</span> — the school
        submits raw marks; ECZ applies the subject weighting centrally.
      </p>

      {!contextReady && (
        <p className="mt-6 text-gray-600">
          Select an academic year in the header bar to view and manage SBA
          plans.
        </p>
      )}

      {contextReady && form && !form.plan && (
        <div className="mt-6">
          <PlanBuilder
            academicYearId={academicYearId!}
            subjects={subjects.data ?? []}
            levels={levels.data ?? []}
            terms={terms.data ?? []}
            existingPlanIds={existingPlanIds}
            onCancel={() => setForm(null)}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {contextReady && (
        <div className="mt-6 rounded-lg bg-white shadow">
          {plans.isLoading && (
            <p className="p-6 text-gray-500">Loading plans...</p>
          )}
          {plans.isError && (
            <p className="p-6 text-red-600">Failed to load plans.</p>
          )}
          {!plans.isLoading && !plans.isError && yearPlans.length === 0 && (
            <p className="p-6 text-gray-500">
              No SBA plans for this year yet.
            </p>
          )}
          {yearPlans.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-gray-500">
                <tr>
                  <th className="p-3">Form</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Tasks</th>
                  <th className="p-3">Total marks</th>
                  <th className="p-3">Status</th>
                  {canManage && <th className="p-3" />}
                </tr>
              </thead>
              <tbody>
                {yearPlans.map((p) =>
                  form?.plan?.planId === p.planId ? (
                    <tr key={p.planId}>
                      <td colSpan={canManage ? 6 : 5} className="p-3">
                        <PlanBuilder
                          academicYearId={academicYearId!}
                          subjects={subjects.data ?? []}
                          levels={levels.data ?? []}
                          terms={terms.data ?? []}
                          existing={p}
                          existingPlanIds={existingPlanIds}
                          onCancel={() => setForm(null)}
                          onSubmit={handleSubmit}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.planId} className="border-b">
                      <td className="p-3">{p.academicLevelCode}</td>
                      <td className="p-3">{p.subjectName}</td>
                      <td className="p-3">{p.tasks.length}</td>
                      <td className="p-3">{p.totalMaxMarks}</td>
                      <td className="p-3">
                        {p.status === "published" ? (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                            published
                          </span>
                        ) : (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            draft
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-3">
                            {p.status === "draft" ? (
                              <>
                                <button
                                  onClick={() => setForm({ plan: p })}
                                  className="text-blue-700 hover:underline"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    setStatus.mutate({
                                      planId: p.planId,
                                      status: "published",
                                    })
                                  }
                                  disabled={
                                    setStatus.isPending || p.tasks.length === 0
                                  }
                                  className="text-green-700 hover:underline disabled:opacity-40"
                                >
                                  Publish
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  setStatus.mutate({
                                    planId: p.planId,
                                    status: "draft",
                                  })
                                }
                                disabled={setStatus.isPending}
                                className="text-amber-700 hover:underline disabled:opacity-40"
                              >
                                Unpublish
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
