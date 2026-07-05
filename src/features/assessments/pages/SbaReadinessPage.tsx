import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useSubjects } from "../../subjects/hooks/subjectQueries";
import { useStreams } from "../../academic/hooks/streamQueries";
import { useTeachingAssignments } from "../../teaching/hooks/teachingQueries";
import { useSbaPlans } from "../hooks/sbaQueries";
import { useSbaSubmissions } from "../hooks/sbaMarksQueries";
import { sbaSubmissionId } from "../../../domain/assessments/SbaSubmission";
import {
  classStage,
  rollUp,
  STAGE_LABEL,
} from "../../../domain/assessments/SbaResultsService";
import type { SbaStage } from "../../../domain/assessments/SbaResultsService";
import { SBA_LEVELS } from "../../../domain/assessments/SbaPlan";

interface ClassRow {
  streamId: string;
  streamName: string;
  stage: SbaStage;
}
interface SubjectGroup {
  key: string;
  level: string;
  subjectId: string;
  subjectName: string;
  classes: ClassRow[];
  stage: SbaStage;
  progress: number;
  ready: number;
}

const STAGE_STYLE: Record<SbaStage, string> = {
  planning: "bg-slate-100 text-slate-600",
  entry: "bg-blue-100 text-blue-800",
  submitted: "bg-indigo-100 text-indigo-800",
  moderated: "bg-violet-100 text-violet-800",
  approved: "bg-green-100 text-green-800",
};

export default function SbaReadinessPage() {
  const { school } = useAuth();
  const schoolCode = school?.schoolCode;
  const { academicYear, academicYearId } = useAcademicContext();

  const plans = useSbaPlans(schoolCode);
  const submissions = useSbaSubmissions(schoolCode);
  const assignments = useTeachingAssignments(schoolCode);
  const subjects = useSubjects(schoolCode);
  const streams = useStreams(schoolCode);

  const groups = useMemo<SubjectGroup[]>(() => {
    if (!academicYearId) return [];

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
    const subjectName = (code: string) =>
      subjects.data?.find((s) => s.subjectCode === code)?.name ?? code;
    const streamName = (id: string) =>
      streams.data?.find((s) => s.streamId === id)?.name ?? id;

    // Classes = the (stream, subject) slots a subject is actually taught in,
    // from the teaching assignments (deduped across terms), F2/F3 only.
    const classes = new Map<string, { level: string; subjectId: string; streamId: string }>();
    for (const a of assignments.data ?? []) {
      if (!a.active || a.academicYearId !== academicYearId) continue;
      if (!(SBA_LEVELS as readonly string[]).includes(a.academicLevelCode)) continue;
      classes.set(`${a.streamId}|${a.subjectId}`, {
        level: a.academicLevelCode,
        subjectId: a.subjectId,
        streamId: a.streamId,
      });
    }

    const bySubject = new Map<string, SubjectGroup>();
    for (const c of classes.values()) {
      const key = `${c.level}|${c.subjectId}`;
      const hasPlan = publishedKey.has(key);
      const status = statusById.get(
        sbaSubmissionId({
          academicYearId,
          streamId: c.streamId,
          subjectId: c.subjectId,
        })
      );
      const stage = classStage(hasPlan, status);
      const group =
        bySubject.get(key) ??
        ({
          key,
          level: c.level,
          subjectId: c.subjectId,
          subjectName: subjectName(c.subjectId),
          classes: [],
          stage: "planning",
          progress: 0,
          ready: 0,
        } as SubjectGroup);
      group.classes.push({ streamId: c.streamId, streamName: streamName(c.streamId), stage });
      bySubject.set(key, group);
    }

    const result = [...bySubject.values()].map((g) => {
      const roll = rollUp(g.classes.map((c) => c.stage));
      g.classes.sort((a, b) => a.streamName.localeCompare(b.streamName));
      return {
        ...g,
        stage: roll.stage,
        progress: roll.progress,
        ready: g.classes.filter((c) => c.stage === "approved").length,
      };
    });
    return result.sort(
      (a, b) =>
        a.level.localeCompare(b.level) ||
        a.subjectName.localeCompare(b.subjectName)
    );
  }, [plans.data, submissions.data, assignments.data, subjects.data, streams.data, academicYearId]);

  const loading = plans.isLoading || submissions.isLoading || assignments.isLoading;

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold">SBA Readiness</h1>
        {academicYear ? (
          <p className="mt-1 text-gray-600">
            {academicYear.name} · how far each subject is through the SBA
            pipeline
          </p>
        ) : (
          <p className="mt-1 text-gray-600">{school?.name}</p>
        )}
      </div>

      {!academicYearId && (
        <p className="mt-6 text-gray-600">
          Select an academic year in the header bar to see SBA readiness.
        </p>
      )}

      {academicYearId && loading && (
        <p className="mt-6 text-gray-500">Loading readiness...</p>
      )}

      {academicYearId && !loading && groups.length === 0 && (
        <p className="mt-6 text-gray-500">
          No SBA classes yet — assign teaching for Form 2/3 subjects and publish
          their plans to populate this board.
        </p>
      )}

      {groups.length > 0 && (
        <div className="mt-6 space-y-3">
          {groups.map((g) => (
            <div key={g.key} className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    {g.subjectName}{" "}
                    <span className="text-gray-400">· {g.level}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {g.classes.length} class{g.classes.length === 1 ? "" : "es"} ·{" "}
                    {g.ready} ready
                  </p>
                </div>
                <div className="flex w-64 shrink-0 items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${g.progress}%` }}
                    />
                  </div>
                  <span
                    className={`w-24 shrink-0 rounded px-2 py-0.5 text-center text-xs ${STAGE_STYLE[g.stage]}`}
                  >
                    {STAGE_LABEL[g.stage]}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                {g.classes.map((c) => (
                  <Link
                    key={c.streamId}
                    to={`/assessments/register?form=${g.level}&stream=${c.streamId}&subject=${g.subjectId}`}
                    className={`rounded px-2 py-0.5 text-xs hover:underline ${STAGE_STYLE[c.stage]}`}
                    title={`${STAGE_LABEL[c.stage]} — open register`}
                  >
                    {c.streamName}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
