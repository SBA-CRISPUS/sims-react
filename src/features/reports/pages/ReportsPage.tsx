import { useMemo } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { useSubscriptionAccess } from "../../schools/hooks/useSubscriptionAccess";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useSubjects } from "../../subjects/hooks/subjectQueries";
import { useTeachingAssignments } from "../../teaching/hooks/teachingQueries";
import { useSbaPlans } from "../../assessments/hooks/sbaQueries";
import { useSbaSubmissions } from "../../assessments/hooks/sbaMarksQueries";
import { useYearEnrollments } from "../../myclasses/hooks/myClassesQueries";
import { sbaSubmissionId } from "../../../domain/assessments/SbaSubmission";
import {
  classStage,
  rollUp,
  STAGE_LABEL,
} from "../../../domain/assessments/SbaResultsService";
import type { SbaStage } from "../../../domain/assessments/SbaResultsService";
import { SBA_LEVELS } from "../../../domain/assessments/SbaPlan";
import { downloadCsv } from "../../../lib/csv";

interface ClassInfo {
  level: string;
  subjectId: string;
  streamId: string;
  stage: SbaStage;
}
interface SubjectRow {
  subjectId: string;
  subjectName: string;
  forms: string[];
  classes: number;
  ready: number;
  stage: SbaStage;
  progress: number;
}

const STAGE_STYLE: Record<SbaStage, string> = {
  planning: "bg-slate-100 text-slate-600",
  entry: "bg-blue-100 text-blue-800",
  submitted: "bg-indigo-100 text-indigo-800",
  moderated: "bg-violet-100 text-violet-800",
  approved: "bg-green-100 text-green-800",
};

export default function ReportsPage() {
  const { school } = useAuth();
  const { hasPlan } = useSubscriptionAccess();
  const schoolCode = school?.schoolCode;
  const { academicYear, academicYearId } = useAcademicContext();

  const assignments = useTeachingAssignments(schoolCode);
  const subjects = useSubjects(schoolCode);
  const plans = useSbaPlans(schoolCode);
  const submissions = useSbaSubmissions(schoolCode);
  const enrollments = useYearEnrollments(schoolCode, academicYearId);

  const model = useMemo(() => {
    if (!academicYearId) return null;

    const subjectName = (c: string) =>
      subjects.data?.find((s) => s.subjectCode === c)?.name ?? c;

    const publishedKey = new Set(
      (plans.data ?? [])
        .filter((p) => p.academicYearId === academicYearId && p.status === "published")
        .map((p) => `${p.academicLevelCode}|${p.subjectId}`)
    );
    const statusById = new Map(
      (submissions.data ?? [])
        .filter((s) => s.academicYearId === academicYearId)
        .map((s) => [s.submissionId, s.status])
    );

    const classesMap = new Map<string, ClassInfo>();
    for (const a of assignments.data ?? []) {
      if (!a.active || a.academicYearId !== academicYearId) continue;
      if (!(SBA_LEVELS as readonly string[]).includes(a.academicLevelCode)) continue;
      const key = `${a.streamId}|${a.subjectId}`;
      if (classesMap.has(key)) continue;
      const stage = classStage(
        publishedKey.has(`${a.academicLevelCode}|${a.subjectId}`),
        statusById.get(
          sbaSubmissionId({
            academicYearId,
            streamId: a.streamId,
            subjectId: a.subjectId,
          })
        )
      );
      classesMap.set(key, {
        level: a.academicLevelCode,
        subjectId: a.subjectId,
        streamId: a.streamId,
        stage,
      });
    }
    const classes = [...classesMap.values()];

    const counts = { planning: 0, entry: 0, submitted: 0, moderated: 0, approved: 0 };
    for (const c of classes) counts[c.stage]++;

    // Per-subject rollup (across its forms/streams) — the compliance radar.
    const bySubject = new Map<string, ClassInfo[]>();
    for (const c of classes) {
      const list = bySubject.get(c.subjectId) ?? [];
      list.push(c);
      bySubject.set(c.subjectId, list);
    }
    const subjectRows: SubjectRow[] = [...bySubject.entries()]
      .map(([subjectId, list]) => {
        const roll = rollUp(list.map((c) => c.stage));
        return {
          subjectId,
          subjectName: subjectName(subjectId),
          forms: [...new Set(list.map((c) => c.level))].sort(),
          classes: list.length,
          ready: list.filter((c) => c.stage === "approved").length,
          stage: roll.stage,
          progress: roll.progress,
        };
      })
      .sort((a, b) => a.progress - b.progress || a.subjectName.localeCompare(b.subjectName));

    // Per-form completion.
    const byForm = (SBA_LEVELS as readonly string[]).map((level) => {
      const list = classes.filter((c) => c.level === level);
      return {
        level,
        total: list.length,
        ready: list.filter((c) => c.stage === "approved").length,
      };
    });

    const learners = (enrollments.data ?? []).filter((e) =>
      (SBA_LEVELS as readonly string[]).includes(e.academicLevelCode)
    ).length;

    return { classes, counts, subjectRows, byForm, learners };
  }, [
    assignments.data,
    subjects.data,
    plans.data,
    submissions.data,
    enrollments.data,
    academicYearId,
  ]);

  const loading = assignments.isLoading || submissions.isLoading;

  function exportCsv() {
    if (!model) return;
    const rows = [
      ["Subject", "Forms", "Classes", "Ready", "Stage", "Progress %"],
      ...model.subjectRows.map((r) => [
        r.subjectName,
        r.forms.join(" "),
        String(r.classes),
        String(r.ready),
        STAGE_LABEL[r.stage],
        String(r.progress),
      ]),
    ];
    downloadCsv(`SBA_Compliance_${academicYearId}.csv`, rows);
  }

  const totalClasses = model?.classes.length ?? 0;
  const readyPct =
    totalClasses > 0 ? Math.round(((model?.counts.approved ?? 0) / totalClasses) * 100) : 0;

  // Analytics/executive reporting is a Professional-edition feature.
  if (!hasPlan("Professional")) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">SBA Reports</h1>
        <div className="mt-6 max-w-xl rounded-lg bg-white p-8 shadow">
          <h2 className="text-lg font-semibold text-amber-700">
            Available on the Professional plan
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            School-wide analytics and compliance reporting are part of the
            Professional edition. Your school is on the Starter plan — ask
            your School Administrator to contact the SIMS provider to
            upgrade. Day-to-day work (students, SBA scoring, exports,
            transfers) is not affected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">SBA Reports</h1>
          {academicYear ? (
            <p className="mt-1 text-gray-600">
              {academicYear.name} · school-wide SBA compliance
            </p>
          ) : (
            <p className="mt-1 text-gray-600">{school?.name}</p>
          )}
        </div>
        {model && totalClasses > 0 && (
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
            >
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-100"
            >
              Print
            </button>
          </div>
        )}
      </div>

      {!academicYearId && (
        <p className="mt-6 text-gray-600">
          Select an academic year in the header bar to see SBA reports.
        </p>
      )}

      {academicYearId && loading && (
        <p className="mt-6 text-gray-500">Loading reports...</p>
      )}

      {academicYearId && !loading && model && totalClasses === 0 && (
        <p className="mt-6 text-gray-600">
          No SBA classes yet for this year. Assign teaching for Form 2/3
          subjects and publish their plans.
        </p>
      )}

      {model && totalClasses > 0 && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="SBA classes" value={totalClasses} tone="slate" />
            <Stat label="Ready" value={model.counts.approved} tone="green" sub={`${readyPct}%`} />
            <Stat
              label="Awaiting approval"
              value={model.counts.submitted + model.counts.moderated}
              tone="indigo"
            />
            <Stat label="Marks entry" value={model.counts.entry} tone="blue" />
            <Stat label="Not planned" value={model.counts.planning} tone="amber" />
            <Stat label="Students (F2/F3)" value={model.learners} tone="slate" />
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold">Compliance by subject</h2>
            <p className="text-sm text-gray-500">
              Least-ready first — where the SBA pipeline needs attention.
            </p>
            <div className="mt-3 space-y-3">
              {model.subjectRows.map((r) => (
                <div key={r.subjectId} className="rounded-lg bg-white p-4 shadow">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium">{r.subjectName}</p>
                      <p className="text-xs text-gray-500">
                        {r.forms.join(", ")} · {r.classes} class
                        {r.classes === 1 ? "" : "es"} · {r.ready} ready
                      </p>
                    </div>
                    <div className="flex w-64 shrink-0 items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${r.progress}%` }}
                        />
                      </div>
                      <span
                        className={`w-24 shrink-0 rounded px-2 py-0.5 text-center text-xs ${STAGE_STYLE[r.stage]}`}
                      >
                        {STAGE_LABEL[r.stage]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold">By form</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {model.byForm
                .filter((f) => f.total > 0)
                .map((f) => {
                  const pct =
                    f.total > 0 ? Math.round((f.ready / f.total) * 100) : 0;
                  return (
                    <div key={f.level} className="rounded-lg bg-white p-4 shadow">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{f.level}</p>
                        <p className="text-sm text-gray-500">
                          {f.ready}/{f.total} ready ({pct}%)
                        </p>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-green-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: number;
  tone: "slate" | "green" | "indigo" | "blue" | "amber";
  sub?: string;
}) {
  const tones = {
    slate: "bg-slate-50 text-slate-700",
    green: "bg-green-50 text-green-800",
    indigo: "bg-indigo-50 text-indigo-800",
    blue: "bg-blue-50 text-blue-800",
    amber: "bg-amber-50 text-amber-800",
  };
  return (
    <div className={`rounded-lg p-4 ${tones[tone]}`}>
      <div className="text-2xl font-bold">
        {value}
        {sub && <span className="ml-1 text-sm font-medium">· {sub}</span>}
      </div>
      <div className="mt-1 text-xs">{label}</div>
    </div>
  );
}
