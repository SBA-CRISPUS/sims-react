import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useStreams } from "../../academic/hooks/streamQueries";
import { useSubjects } from "../../subjects/hooks/subjectQueries";
import { useTeachingAssignments } from "../../teaching/hooks/teachingQueries";
import { useSbaPlans } from "../../assessments/hooks/sbaQueries";
import { useSbaSubmissions } from "../../assessments/hooks/sbaMarksQueries";
import { sbaSubmissionId } from "../../../domain/assessments/SbaSubmission";
import {
  classStage,
  STAGE_LABEL,
} from "../../../domain/assessments/SbaResultsService";
import type { SbaStage } from "../../../domain/assessments/SbaResultsService";

type Bucket = "toSubmit" | "returned" | "awaiting" | "approved" | "awaitingPlan";

interface ClassRow {
  academicLevelCode: string;
  streamId: string;
  subjectId: string;
  subjectName: string;
  streamName: string;
  stage: SbaStage;
  bucket: Bucket;
}

const STAGE_STYLE: Record<SbaStage, string> = {
  planning: "bg-slate-100 text-slate-600",
  entry: "bg-blue-100 text-blue-800",
  submitted: "bg-indigo-100 text-indigo-800",
  moderated: "bg-violet-100 text-violet-800",
  approved: "bg-green-100 text-green-800",
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function TeacherDashboard() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const empNo = profile?.employeeNumber;
  const { academicYear, term, academicYearId } = useAcademicContext();

  const assignments = useTeachingAssignments(schoolCode);
  const subjects = useSubjects(schoolCode);
  const streams = useStreams(schoolCode);
  const plans = useSbaPlans(schoolCode);
  const submissions = useSbaSubmissions(schoolCode);

  const rows = useMemo<ClassRow[]>(() => {
    if (!empNo || !academicYearId) return [];
    const subjectName = (c: string) =>
      subjects.data?.find((s) => s.subjectCode === c)?.name ?? c;
    const streamName = (id: string) =>
      streams.data?.find((s) => s.streamId === id)?.name ?? id;

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

    const seen = new Map<string, ClassRow>();
    for (const a of assignments.data ?? []) {
      if (!a.active || a.teacherId !== empNo || a.academicYearId !== academicYearId)
        continue;
      const key = `${a.streamId}|${a.subjectId}`;
      if (seen.has(key)) continue;

      const status = statusById.get(
        sbaSubmissionId({
          academicYearId,
          streamId: a.streamId,
          subjectId: a.subjectId,
        })
      );
      const hasPlan = publishedKey.has(`${a.academicLevelCode}|${a.subjectId}`);
      const stage = classStage(hasPlan, status);

      let bucket: Bucket;
      if (status === "returned") bucket = "returned";
      else if (stage === "entry") bucket = "toSubmit";
      else if (stage === "submitted" || stage === "moderated") bucket = "awaiting";
      else if (stage === "approved") bucket = "approved";
      else bucket = "awaitingPlan";

      seen.set(key, {
        academicLevelCode: a.academicLevelCode,
        streamId: a.streamId,
        subjectId: a.subjectId,
        subjectName: subjectName(a.subjectId),
        streamName: streamName(a.streamId),
        stage,
        bucket,
      });
    }
    return [...seen.values()].sort(
      (x, y) =>
        x.academicLevelCode.localeCompare(y.academicLevelCode) ||
        x.streamName.localeCompare(y.streamName)
    );
  }, [
    assignments.data,
    subjects.data,
    streams.data,
    plans.data,
    submissions.data,
    empNo,
    academicYearId,
  ]);

  const counts = useMemo(() => {
    const c = { toSubmit: 0, returned: 0, awaiting: 0, approved: 0, awaitingPlan: 0 };
    for (const r of rows) c[r.bucket]++;
    return c;
  }, [rows]);

  const notifications: string[] = [];
  if (counts.returned > 0)
    notifications.push(
      `${counts.returned} sheet${counts.returned === 1 ? "" : "s"} returned for correction — needs your attention.`
    );
  if (counts.toSubmit > 0)
    notifications.push(
      `${counts.toSubmit} class${counts.toSubmit === 1 ? "" : "es"} still need marks entered and submitted.`
    );
  if (counts.awaiting > 0)
    notifications.push(
      `${counts.awaiting} sheet${counts.awaiting === 1 ? "" : "s"} submitted — awaiting moderation/approval.`
    );
  if (rows.length > 0 && notifications.length === 0)
    notifications.push("You're all caught up — every SBA sheet is approved. 🎉");

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">
        {greeting()}
        {profile?.displayName ? `, ${profile.displayName}` : ""}
      </h1>
      <p className="mt-1 text-gray-600">
        {academicYear
          ? `${academicYear.name}${term ? ` · ${term.name}` : ""}`
          : school?.name}
      </p>

      {!academicYearId && (
        <p className="mt-6 text-gray-600">
          Select an academic year in the header bar to see your SBA work.
        </p>
      )}

      {academicYearId && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="To submit" value={counts.toSubmit} tone="blue" />
            <Stat label="Returned" value={counts.returned} tone="amber" />
            <Stat label="Awaiting approval" value={counts.awaiting} tone="indigo" />
            <Stat label="Approved" value={counts.approved} tone="green" />
          </div>

          {notifications.length > 0 && (
            <div className="mt-6 rounded-lg bg-white p-5 shadow">
              <p className="font-medium">What needs your attention</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {notifications.map((n, i) => (
                  <li key={i}>• {n}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <p className="font-medium">Your classes</p>
            <Link to="/my-classes" className="text-sm text-blue-700 hover:underline">
              Open My Classes →
            </Link>
          </div>

          {rows.length === 0 ? (
            <p className="mt-3 text-gray-600">
              No classes are assigned to you for this year yet.
            </p>
          ) : (
            <div className="mt-3 divide-y rounded-lg bg-white shadow">
              {rows.map((r) => (
                <Link
                  key={`${r.streamId}|${r.subjectId}`}
                  to={`/assessments/marks?form=${r.academicLevelCode}&stream=${r.streamId}&subject=${r.subjectId}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium">{r.subjectName}</p>
                    <p className="text-sm text-gray-500">
                      {r.academicLevelCode} · {r.streamName}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${STAGE_STYLE[r.stage]}`}
                  >
                    {STAGE_LABEL[r.stage]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "amber" | "indigo" | "green";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-800",
    amber: "bg-amber-50 text-amber-800",
    indigo: "bg-indigo-50 text-indigo-800",
    green: "bg-green-50 text-green-800",
  };
  return (
    <div className={`rounded-lg p-5 ${tones[tone]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm">{label}</div>
    </div>
  );
}
