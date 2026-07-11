import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import {
  useAcademicYears,
  useLevels,
  useStreams,
} from "../../academic/hooks/streamQueries";
import { useRegistry } from "../hooks/studentQueries";
import { useSubscriptionAccess } from "../../schools/hooks/useSubscriptionAccess";
import { PromotionService } from "../../../domain/students/PromotionService";
import type {
  PromotionAction,
  PromotionRow,
  PromotionResult,
} from "../../../domain/students/PromotionService";
import { AcademicYearService } from "../../../domain/academic/AcademicYearService";
import { fullName } from "../format";

/**
 * The January tool (docs/PROMOTION_DESIGN.md): moves every active
 * student into the next academic year - promote a form, repeat, or
 * graduate (F4) - as batched new enrollments. Old-year records are
 * never touched; re-runs are safe (already-enrolled students are
 * marked, not duplicated).
 */
export default function PromotionPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const isAdmin = profile?.role === "school_admin";
  const { readOnly } = useSubscriptionAccess();
  const { academicYear: sourceYear, academicYearId: sourceYearId } =
    useAcademicContext();
  const queryClient = useQueryClient();

  const years = useAcademicYears(schoolCode);
  const levels = useLevels(schoolCode);
  const streams = useStreams(schoolCode);
  const registry = useRegistry(schoolCode);

  const [targetYearId, setTargetYearId] = useState("");
  const [overrides, setOverrides] = useState<
    Record<string, PromotionAction>
  >({});
  const [formFilter, setFormFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<PromotionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Students already in the target year - the idempotency set.
  const enrolled = useQuery({
    queryKey: ["promotion-enrolled", schoolCode, targetYearId],
    enabled: !!schoolCode && !!targetYearId,
    queryFn: () =>
      PromotionService.listEnrolledStudentIds(schoolCode!, targetYearId),
  });

  const sourceYearNum = (years.data ?? []).find(
    (y) => y.academicYearId === sourceYearId
  )?.year;
  const laterYears = (years.data ?? [])
    .filter((y) => sourceYearNum !== undefined && y.year > sourceYearNum)
    .sort((a, b) => a.year - b.year);

  const levelOrder = useMemo(
    () => (levels.data ?? []).map((l) => l.levelCode).sort(),
    [levels.data]
  );
  const nextLevel = (code: string): string | null => {
    const i = levelOrder.indexOf(code);
    return i >= 0 && i < levelOrder.length - 1 ? levelOrder[i + 1] : null;
  };
  const streamCarries = (toLevel: string, streamCode: string) =>
    !!streamCode &&
    (streams.data ?? []).some(
      (s) =>
        s.academicLevelCode === toLevel &&
        s.streamCode === streamCode &&
        s.active
    );

  // Everyone active with an enrollment in the SOURCE year.
  const candidates = useMemo(
    () =>
      (registry.data ?? [])
        .filter(
          (r) =>
            r.student.status === "active" &&
            r.enrollment?.academicYearId === sourceYearId
        )
        .sort(
          (a, b) =>
            (a.enrollment?.academicLevelCode ?? "").localeCompare(
              b.enrollment?.academicLevelCode ?? ""
            ) || fullName(a.student).localeCompare(fullName(b.student))
        ),
    [registry.data, sourceYearId]
  );

  const visible = formFilter
    ? candidates.filter(
        (r) => r.enrollment?.academicLevelCode === formFilter
      )
    : candidates;

  function actionFor(r: (typeof candidates)[number]): PromotionAction {
    const override = overrides[r.student.studentNumber];
    if (override) return override;
    return nextLevel(r.enrollment?.academicLevelCode ?? "") === null
      ? "graduate"
      : "promote";
  }

  const summary = useMemo(() => {
    const counts = { promote: 0, repeat: 0, graduate: 0, skip: 0, already: 0 };
    for (const r of candidates) {
      if (enrolled.data?.has(r.student.studentNumber)) counts.already++;
      else counts[actionFor(r)]++;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, overrides, enrolled.data, levelOrder]);

  async function createNextYear() {
    if (!schoolCode || sourceYearNum === undefined) return;
    setError(null);
    try {
      const id = await AcademicYearService.createYear(
        schoolCode,
        sourceYearNum + 1
      );
      queryClient.invalidateQueries({
        queryKey: ["academic-years", schoolCode],
      });
      setTargetYearId(id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the year."
      );
    }
  }

  async function makeCurrent() {
    if (!schoolCode || !targetYearId) return;
    if (
      !window.confirm(
        "Make this the school's current year? New admissions and transfers will default to it. Do this when the new year actually starts."
      )
    )
      return;
    await AcademicYearService.setCurrentYear(
      schoolCode,
      targetYearId,
      (years.data ?? []).map((y) => y.academicYearId)
    );
    queryClient.invalidateQueries({ queryKey: ["academic-years", schoolCode] });
    queryClient.invalidateQueries({ queryKey: ["school", schoolCode] });
  }

  async function apply() {
    if (!schoolCode || !targetYearId) return;
    const rows: PromotionRow[] = candidates
      .filter((r) => !enrolled.data?.has(r.student.studentNumber))
      .map((r) => {
        const action = actionFor(r);
        const from = r.enrollment!;
        const toLevel =
          action === "promote"
            ? (nextLevel(from.academicLevelCode) ?? from.academicLevelCode)
            : from.academicLevelCode;
        return {
          studentNumber: r.student.studentNumber,
          action,
          toLevel,
          toStream: streamCarries(toLevel, from.streamId) ? from.streamId : "",
        };
      });

    const acting = rows.filter((r) => r.action !== "skip").length;
    if (
      !window.confirm(
        `Apply the year change for ${acting} students into ${targetYearId}?\n\nPromote: ${summary.promote} · Repeat: ${summary.repeat} · Graduate: ${summary.graduate} · Skip: ${summary.skip}\n\nOld-year records are not changed; this can be re-run safely for anyone missed.`
      )
    )
      return;

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await PromotionService.apply(
        schoolCode,
        targetYearId,
        rows,
        (done, total) => setProgress(`${done}/${total}`)
      );
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ["registry", schoolCode] });
      queryClient.invalidateQueries({
        queryKey: ["count-active-students", schoolCode],
      });
      queryClient.invalidateQueries({
        queryKey: ["promotion-enrolled", schoolCode, targetYearId],
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Promotion failed part-way — re-open this page and re-run; already-enrolled students are skipped automatically."
      );
    } finally {
      setBusy(false);
    }
  }

  if (readOnly) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Promotion</h1>
        <p className="mt-6 max-w-xl rounded-lg bg-amber-50 p-6 text-sm text-amber-800">
          The school is in read-only mode (lapsed subscription) — the year
          change is paused until the subscription is renewed.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Promotion — year change</h1>
      <p className="mt-1 text-gray-600">
        Moves active students from {sourceYear?.name ?? "the selected year"}{" "}
        into the next academic year. Defaults: promote one form; the top
        form graduates. Adjust individual students below, then apply.
      </p>

      {!sourceYearId && (
        <p className="mt-6 text-gray-600">
          Select the OLD (ending) academic year in the header bar first.
        </p>
      )}

      {sourceYearId && (
        <>
          <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow">
            <div>
              <label className="block text-sm text-gray-600">
                Promote into
              </label>
              <select
                value={targetYearId}
                onChange={(e) => setTargetYearId(e.target.value)}
                className="mt-1 rounded border p-2"
              >
                <option value="">Select target year...</option>
                {laterYears.map((y) => (
                  <option key={y.academicYearId} value={y.academicYearId}>
                    {y.name}
                    {y.current ? " (current)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {laterYears.length === 0 && isAdmin && (
              <button
                onClick={createNextYear}
                className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800"
              >
                Create {sourceYearNum !== undefined ? sourceYearNum + 1 : "next"}{" "}
                Academic Year
              </button>
            )}
            {targetYearId &&
              isAdmin &&
              !laterYears.find((y) => y.academicYearId === targetYearId)
                ?.current && (
                <button
                  onClick={makeCurrent}
                  className="rounded border border-blue-700 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                >
                  Make it the current year
                </button>
              )}
            <div>
              <label className="block text-sm text-gray-600">Form</label>
              <select
                value={formFilter}
                onChange={(e) => setFormFilter(e.target.value)}
                className="mt-1 rounded border p-2"
              >
                <option value="">All forms</option>
                {levelOrder.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {targetYearId && (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <Chip label="Promote" value={summary.promote} tone="green" />
                <Chip label="Repeat" value={summary.repeat} tone="amber" />
                <Chip label="Graduate" value={summary.graduate} tone="blue" />
                <Chip label="Skip" value={summary.skip} tone="slate" />
                {summary.already > 0 && (
                  <Chip
                    label="Already enrolled"
                    value={summary.already}
                    tone="slate"
                  />
                )}
                <button
                  onClick={apply}
                  disabled={busy || registry.isLoading || enrolled.isLoading}
                  className="ml-auto rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {busy ? `Applying... ${progress}` : "Apply year change"}
                </button>
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              {result && (
                <p className="mt-3 rounded bg-green-50 p-3 text-sm text-green-800">
                  Done — {result.enrolled} enrolled in {targetYearId},{" "}
                  {result.graduated} graduated, {result.skipped} skipped.
                  Newly promoted students without a carried stream appear
                  with a placement banner on their profiles.
                </p>
              )}

              <div className="mt-4 overflow-x-auto rounded-lg bg-white shadow">
                {registry.isLoading ? (
                  <p className="p-6 text-gray-500">Loading students...</p>
                ) : visible.length === 0 ? (
                  <p className="p-6 text-gray-500">
                    No active students with a {sourceYear?.name} enrollment
                    {formFilter ? ` in ${formFilter}` : ""}.
                  </p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-slate-50 text-gray-500">
                      <tr>
                        <th className="p-3">Student</th>
                        <th className="p-3">Now</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Next year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((r) => {
                        const s = r.student;
                        const from = r.enrollment!;
                        const already = enrolled.data?.has(s.studentNumber);
                        const action = actionFor(r);
                        const isTop =
                          nextLevel(from.academicLevelCode) === null;
                        const toLevel =
                          action === "promote"
                            ? (nextLevel(from.academicLevelCode) ??
                              from.academicLevelCode)
                            : from.academicLevelCode;
                        return (
                          <tr key={s.studentNumber} className="border-b">
                            <td className="p-3">
                              {fullName(s)}
                              <span className="ml-2 font-mono text-xs text-gray-400">
                                {s.studentNumber}
                              </span>
                            </td>
                            <td className="p-3">
                              {from.academicLevelCode}{" "}
                              {from.streamId || "(unplaced)"}
                            </td>
                            <td className="p-3">
                              {already ? (
                                <span className="text-xs text-gray-400">
                                  already enrolled
                                </span>
                              ) : (
                                <select
                                  value={action}
                                  onChange={(e) =>
                                    setOverrides((o) => ({
                                      ...o,
                                      [s.studentNumber]: e.target
                                        .value as PromotionAction,
                                    }))
                                  }
                                  className="rounded border p-1 text-sm"
                                >
                                  {!isTop && (
                                    <option value="promote">Promote</option>
                                  )}
                                  <option value="repeat">Repeat</option>
                                  {isTop && (
                                    <option value="graduate">Graduate</option>
                                  )}
                                  <option value="skip">Skip</option>
                                </select>
                              )}
                            </td>
                            <td className="p-3 text-gray-600">
                              {already
                                ? "—"
                                : action === "graduate"
                                  ? "graduated 🎓"
                                  : action === "skip"
                                    ? "—"
                                    : `${toLevel} ${
                                        streamCarries(toLevel, from.streamId)
                                          ? from.streamId
                                          : "(to be placed)"
                                      }`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Chip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "blue" | "slate";
}) {
  const tones = {
    green: "bg-green-50 text-green-800",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-blue-50 text-blue-800",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`rounded px-3 py-1 ${tones[tone]}`}>
      {label}: <b>{value}</b>
    </span>
  );
}
