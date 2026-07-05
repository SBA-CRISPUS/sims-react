import { useMemo, useState } from "react";

import type { Student } from "../../../domain/students/Student";
import type { SbaPlan } from "../../../domain/assessments/SbaPlan";
import type { SbaMark } from "../../../domain/assessments/SbaMark";
import type { SbaClassSubmission } from "../../../domain/assessments/SbaSubmission";
import { SBA_OPEN_STATUSES } from "../../../domain/assessments/SbaSubmission";
import type { MarkDraft } from "../../../domain/assessments/SbaMarkService";
import {
  obtainedTotal,
  sbaRawOutOf100,
  totalMaxMarks,
} from "../../../domain/assessments/SbaCalculationService";

interface Props {
  plan: SbaPlan;
  roster: Student[];
  marks: SbaMark[];
  submission: SbaClassSubmission | null;
  canScore: boolean;
  canManage: boolean;
  saving: boolean;
  onSave: (rows: MarkDraft[]) => Promise<void>;
  onSubmit: () => Promise<void>;
  onWithdraw: () => Promise<void>;
}

function studentName(s: Student): string {
  return [s.firstName, s.otherNames, s.lastName].filter(Boolean).join(" ");
}

export default function MarksGrid({
  plan,
  roster,
  marks,
  submission,
  canScore,
  canManage,
  saving,
  onSave,
  onSubmit,
  onWithdraw,
}: Props) {
  const tasks = plan.tasks;
  const planMax = totalMaxMarks(tasks);

  const existingIds = useMemo(
    () => new Set(marks.map((m) => m.studentId)),
    [marks]
  );

  const [scores, setScores] = useState<Record<string, Record<string, number>>>(
    () => {
      const seed: Record<string, Record<string, number>> = {};
      for (const m of marks) seed[m.studentId] = { ...m.taskScores };
      return seed;
    }
  );
  const [notTaking, setNotTaking] = useState<Record<string, boolean>>(() => {
    const seed: Record<string, boolean> = {};
    for (const m of marks) seed[m.studentId] = !!m.notTaking;
    return seed;
  });
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const status = submission?.status ?? "draft";
  const editable = canScore && SBA_OPEN_STATUSES.includes(status);

  function markDirty(studentId: string) {
    setDirty((prev) => new Set(prev).add(studentId));
  }

  function setScore(studentId: string, taskId: string, value?: number) {
    setScores((prev) => {
      const row = { ...(prev[studentId] ?? {}) };
      if (value === undefined) delete row[taskId];
      else row[taskId] = value;
      return { ...prev, [studentId]: row };
    });
    markDirty(studentId);
  }

  function toggleNotTaking(studentId: string) {
    setNotTaking((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
    markDirty(studentId);
  }

  function scoredCount(studentId: string): number {
    const row = scores[studentId] ?? {};
    return tasks.filter((t) => row[t.taskId] !== undefined).length;
  }

  const incomplete = roster.filter(
    (s) =>
      !notTaking[s.studentNumber] && scoredCount(s.studentNumber) < tasks.length
  ).length;

  async function handleSave() {
    setError(null);
    const rows: MarkDraft[] = [...dirty].map((studentId) => {
      const student = roster.find((s) => s.studentNumber === studentId);
      return {
        studentId,
        ...(student?.examinationNumber
          ? { examinationNumber: student.examinationNumber }
          : {}),
        taskScores: scores[studentId] ?? {},
        notTaking: notTaking[studentId] ?? false,
        exists: existingIds.has(studentId),
      };
    });
    try {
      await onSave(rows);
      setDirty(new Set());
    } catch (e) {
      console.error(e);
      setError(e instanceof Error && e.message ? e.message : "Save failed.");
    }
  }

  async function handleSubmit() {
    setError(null);
    try {
      await onSubmit();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error && e.message ? e.message : "Submit failed.");
    }
  }

  async function handleWithdraw() {
    setError(null);
    try {
      await onWithdraw();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error && e.message ? e.message : "Failed.");
    }
  }

  if (roster.length === 0) {
    return (
      <p className="rounded-lg bg-white p-6 text-gray-500 shadow">
        No learners are enrolled in this stream for the selected year.
      </p>
    );
  }

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <p className="font-medium">
            {plan.subjectName} · {plan.academicLevelCode}
          </p>
          <p className="text-sm text-gray-500">
            {tasks.length} tasks · {planMax} marks total · raw ÷ {planMax} × 100
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          {dirty.size > 0 && (
            <span className="text-sm text-amber-700">
              {dirty.size} unsaved
            </span>
          )}
        </div>
      </div>

      {status === "submitted" && (
        <p className="border-b bg-slate-50 p-3 text-sm text-gray-600">
          Submitted for moderation — the sheet is locked.
          {canManage && " Reopen it to correct marks."}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-gray-500">
            <tr>
              <th className="sticky left-0 bg-slate-50 p-3">Learner</th>
              {tasks.map((t) => (
                <th key={t.taskId} className="p-2 text-center" title={t.type}>
                  <div className="whitespace-nowrap">{t.name || t.taskId}</div>
                  <div className="font-normal text-gray-400">/{t.maxMarks}</div>
                </th>
              ))}
              <th className="p-2 text-center">Total</th>
              <th className="p-2 text-center">Raw %</th>
              <th className="p-2 text-center">Not taking</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((s) => {
              const sid = s.studentNumber;
              const row = scores[sid] ?? {};
              const nt = notTaking[sid] ?? false;
              const got = obtainedTotal(row, tasks);
              const raw = sbaRawOutOf100(row, tasks);
              return (
                <tr key={sid} className="border-b">
                  <td className="sticky left-0 bg-white p-3">
                    <div className="font-medium">{studentName(s)}</div>
                    <div className="text-xs text-gray-400">
                      {s.examinationNumber
                        ? `Exam ${s.examinationNumber}`
                        : sid}
                    </div>
                  </td>
                  {tasks.map((t) => (
                    <td key={t.taskId} className="p-1 text-center">
                      <input
                        type="number"
                        min={0}
                        max={t.maxMarks}
                        disabled={!editable || nt}
                        value={row[t.taskId] ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") setScore(sid, t.taskId, undefined);
                          else {
                            const num = Number(v);
                            if (!Number.isNaN(num))
                              setScore(
                                sid,
                                t.taskId,
                                Math.max(0, Math.min(t.maxMarks, Math.floor(num)))
                              );
                          }
                        }}
                        className="w-14 rounded border p-1 text-center disabled:bg-slate-100 disabled:text-gray-300"
                      />
                    </td>
                  ))}
                  <td className="p-2 text-center text-gray-600">
                    {nt ? "—" : `${got}/${planMax}`}
                  </td>
                  <td className="p-2 text-center font-medium">
                    {nt ? "—" : raw}
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      disabled={!editable}
                      checked={nt}
                      onChange={() => toggleNotTaking(sid)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && <p className="p-3 text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 border-t p-4">
        {editable && (
          <>
            <button
              onClick={handleSave}
              disabled={saving || dirty.size === 0}
              className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                saving ||
                dirty.size > 0 ||
                !submission ||
                incomplete > 0
              }
              className="rounded border border-green-700 px-4 py-2 text-green-700 hover:bg-green-50 disabled:opacity-40"
            >
              Submit for moderation
            </button>
            {incomplete > 0 && (
              <span className="text-sm text-gray-500">
                {incomplete} learner{incomplete === 1 ? "" : "s"} with unscored
                tasks
              </span>
            )}
            {dirty.size > 0 && (
              <span className="text-sm text-gray-500">Save before submitting</span>
            )}
          </>
        )}
        {status === "submitted" && canManage && (
          <button
            onClick={handleWithdraw}
            disabled={saving}
            className="rounded border border-amber-700 px-4 py-2 text-amber-700 hover:bg-amber-50 disabled:opacity-40"
          >
            Reopen for editing
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    returned: "bg-amber-100 text-amber-800",
    submitted: "bg-blue-100 text-blue-800",
    moderated: "bg-indigo-100 text-indigo-800",
    approved: "bg-green-100 text-green-800",
    locked: "bg-green-100 text-green-800",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs ${styles[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
}
