import { useMemo, useRef, useState } from "react";

import type { Subject } from "../../../domain/subjects/Subject";
import type { AcademicLevel } from "../../../domain/academic/AcademicLevel";
import type { Term } from "../../../domain/academic/AcademicYear";
import {
  SBA_LEVELS,
  SBA_TASK_TYPES,
  sbaPlanId,
} from "../../../domain/assessments/SbaPlan";
import type {
  SbaPlan,
  SbaPlanInput,
  SbaTask,
} from "../../../domain/assessments/SbaPlan";
import { totalMaxMarks } from "../../../domain/assessments/SbaCalculationService";
import { SbaValidator } from "../../../domain/assessments/SbaValidator";

interface Props {
  academicYearId: string;
  subjects: Subject[];
  levels: AcademicLevel[];
  terms: Term[];
  existing?: SbaPlan;
  existingPlanIds: string[];
  onCancel: () => void;
  onSubmit: (input: SbaPlanInput) => Promise<void>;
}

function nextOrdinal(tasks: SbaTask[] | undefined): number {
  return (tasks ?? []).reduce((m, t) => {
    const n = parseInt(t.taskId.replace(/^t/, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
}

export default function PlanBuilder({
  academicYearId,
  subjects,
  levels,
  terms,
  existing,
  existingPlanIds,
  onCancel,
  onSubmit,
}: Props) {
  const editing = !!existing;
  const [academicLevelCode, setLevel] = useState(
    existing?.academicLevelCode ?? ""
  );
  const [subjectId, setSubjectId] = useState(existing?.subjectId ?? "");
  const [tasks, setTasks] = useState<SbaTask[]>(existing?.tasks ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Monotonic task-id counter so deleting a row never renumbers the
  // others (marks will reference taskId in 5B).
  const counter = useRef(nextOrdinal(existing?.tasks));

  // SBA is Form 2 & Form 3 only - and only forms the school actually has.
  const sbaLevels = levels.filter((l) =>
    (SBA_LEVELS as readonly string[]).includes(l.levelCode)
  );

  // Subjects that do SBA and are offered at the chosen form.
  const eligibleSubjects = useMemo(
    () =>
      subjects.filter(
        (s) =>
          s.sbaEnabled &&
          s.active &&
          (!academicLevelCode || s.formsOffered.includes(academicLevelCode))
      ),
    [subjects, academicLevelCode]
  );

  const total = totalMaxMarks(tasks);

  // Warn when a brand-new plan targets a slot that already has one -
  // saving upserts (edits) it rather than creating a duplicate.
  const collides =
    !editing &&
    academicLevelCode &&
    subjectId &&
    existingPlanIds.includes(
      sbaPlanId({ academicYearId, academicLevelCode, subjectId })
    );

  function addTask() {
    counter.current += 1;
    setTasks((prev) => [
      ...prev,
      { taskId: `t${counter.current}`, name: "", type: SBA_TASK_TYPES[0], maxMarks: 10 },
    ]);
  }

  function patchTask(taskId: string, patch: Partial<SbaTask>) {
    setTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, ...patch } : t))
    );
  }

  function removeTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
  }

  async function submit() {
    setError(null);
    const subject = subjects.find((s) => s.subjectCode === subjectId);
    const input: SbaPlanInput = {
      academicYearId,
      academicLevelCode,
      subjectId,
      subjectName: subject?.name ?? subjectId,
      tasks: tasks.map((t) => ({
        taskId: t.taskId,
        name: t.name.trim(),
        type: t.type,
        maxMarks: t.maxMarks,
        ...(t.termId ? { termId: t.termId } : {}),
      })),
    };

    const err = SbaValidator.validate(input);
    if (err) {
      setError(err);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(input);
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error && e.message ? e.message : "Save failed. Try again."
      );
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <p className="font-medium">
        {editing ? `Edit plan · ${existing!.subjectName}` : "New SBA plan"}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-gray-600">Form</label>
          <select
            value={academicLevelCode}
            onChange={(e) => {
              setLevel(e.target.value);
              setSubjectId("");
            }}
            disabled={editing}
            className="w-full rounded border p-2 disabled:bg-slate-100 disabled:opacity-70"
          >
            <option value="">Select form...</option>
            {sbaLevels.map((l) => (
              <option key={l.levelCode} value={l.levelCode}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600">Subject</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={editing || !academicLevelCode}
            className="w-full rounded border p-2 disabled:bg-slate-100 disabled:opacity-70"
          >
            <option value="">Select subject...</option>
            {eligibleSubjects.map((s) => (
              <option key={s.subjectCode} value={s.subjectCode}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {academicLevelCode && eligibleSubjects.length === 0 && (
        <p className="mt-2 text-sm text-amber-700">
          No SBA-enabled subjects are offered at this form. Enable SBA on a
          subject (and add this form to its "forms offered") in Subjects first.
        </p>
      )}

      {collides && (
        <p className="mt-2 text-sm text-amber-700">
          A plan already exists for this subject and form. Saving will update
          it. To edit the existing one, cancel and use its Edit button.
        </p>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Tasks</p>
          <p className="text-sm text-gray-600">
            {tasks.length} task{tasks.length === 1 ? "" : "s"} · total{" "}
            <span className="font-semibold">{total}</span> marks
          </p>
        </div>

        {tasks.length > 0 && (
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="py-1 pr-2">Name</th>
                <th className="py-1 pr-2">Type</th>
                <th className="py-1 pr-2 w-24">Max</th>
                <th className="py-1 pr-2">Term</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.taskId}>
                  <td className="py-1 pr-2">
                    <input
                      value={t.name}
                      onChange={(e) => patchTask(t.taskId, { name: e.target.value })}
                      placeholder="e.g. Class Test 1"
                      className="w-full rounded border p-1.5"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      value={t.type}
                      onChange={(e) => patchTask(t.taskId, { type: e.target.value })}
                      className="w-full rounded border p-1.5"
                    >
                      {SBA_TASK_TYPES.map((ty) => (
                        <option key={ty} value={ty}>
                          {ty}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={1}
                      value={t.maxMarks}
                      onChange={(e) =>
                        patchTask(t.taskId, { maxMarks: Number(e.target.value) })
                      }
                      className="w-full rounded border p-1.5"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      value={t.termId ?? ""}
                      onChange={(e) =>
                        patchTask(t.taskId, {
                          termId: e.target.value || undefined,
                        })
                      }
                      className="w-full rounded border p-1.5"
                    >
                      <option value="">Whole year</option>
                      {terms.map((term) => (
                        <option key={term.termId} value={term.termId}>
                          {term.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeTask(t.taskId)}
                      className="text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button
          type="button"
          onClick={addTask}
          className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
        >
          + Add task
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save plan"}
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
