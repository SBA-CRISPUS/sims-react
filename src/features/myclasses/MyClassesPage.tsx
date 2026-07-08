import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/hooks/useAuth";
import { useAcademicContext } from "../academic/hooks/useAcademicContext";
import { useStreams } from "../academic/hooks/streamQueries";
import { useSubjects } from "../subjects/hooks/subjectQueries";
import { useTeachingAssignments } from "../teaching/hooks/teachingQueries";
import { useSbaPlans } from "../assessments/hooks/sbaQueries";
import { useSbaSubmissions } from "../assessments/hooks/sbaMarksQueries";
import { useYearEnrollments } from "./hooks/myClassesQueries";
import { sbaSubmissionId } from "../../domain/assessments/SbaSubmission";
import {
  classStage,
  STAGE_LABEL,
} from "../../domain/assessments/SbaResultsService";
import type { SbaStage } from "../../domain/assessments/SbaResultsService";

interface ClassCard {
  academicLevelCode: string;
  streamId: string;
  subjectId: string;
  subjectName: string;
  streamName: string;
  learners: number;
  stage: SbaStage;
}

const STAGE_STYLE: Record<SbaStage, string> = {
  planning: "bg-slate-100 text-slate-600",
  entry: "bg-blue-100 text-blue-800",
  submitted: "bg-indigo-100 text-indigo-800",
  moderated: "bg-violet-100 text-violet-800",
  approved: "bg-green-100 text-green-800",
};

function streamCodeOf(streamId: string): string {
  const dash = streamId.indexOf("-");
  return dash >= 0 ? streamId.slice(dash + 1) : streamId;
}

export default function MyClassesPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const empNo = profile?.employeeNumber;
  const { academicYear, term, academicYearId } = useAcademicContext();

  const assignments = useTeachingAssignments(schoolCode);
  const subjects = useSubjects(schoolCode);
  const streams = useStreams(schoolCode);
  const plans = useSbaPlans(schoolCode);
  const submissions = useSbaSubmissions(schoolCode);
  const enrollments = useYearEnrollments(schoolCode, academicYearId);

  const cards = useMemo<ClassCard[]>(() => {
    if (!empNo || !academicYearId) return [];

    const subjectName = (code: string) =>
      subjects.data?.find((s) => s.subjectCode === code)?.name ?? code;
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

    // Distinct (stream, subject) the teacher is assigned this year.
    const seen = new Map<string, ClassCard>();
    for (const a of assignments.data ?? []) {
      if (!a.active || a.teacherId !== empNo || a.academicYearId !== academicYearId)
        continue;
      const key = `${a.streamId}|${a.subjectId}`;
      if (seen.has(key)) continue;

      const code = streamCodeOf(a.streamId);
      const learners = (enrollments.data ?? []).filter(
        (e) =>
          e.academicLevelCode === a.academicLevelCode &&
          (e.streamId === code || e.streamId === a.streamId)
      ).length;

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

      seen.set(key, {
        academicLevelCode: a.academicLevelCode,
        streamId: a.streamId,
        subjectId: a.subjectId,
        subjectName: subjectName(a.subjectId),
        streamName: streamName(a.streamId),
        learners,
        stage,
      });
    }

    return [...seen.values()].sort(
      (a, b) =>
        a.academicLevelCode.localeCompare(b.academicLevelCode) ||
        a.streamName.localeCompare(b.streamName) ||
        a.subjectName.localeCompare(b.subjectName)
    );
  }, [
    assignments.data,
    subjects.data,
    streams.data,
    plans.data,
    submissions.data,
    enrollments.data,
    empNo,
    academicYearId,
  ]);

  const loading =
    assignments.isLoading || enrollments.isLoading || submissions.isLoading;

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold">
          {profile?.displayName ? `Welcome, ${profile.displayName}` : "My Classes"}
        </h1>
        {academicYear ? (
          <p className="mt-1 text-gray-600">
            My Classes · {academicYear.name}
            {term ? ` · ${term.name}` : ""}
          </p>
        ) : (
          <p className="mt-1 text-gray-600">{school?.name}</p>
        )}
      </div>

      {!empNo && (
        <p className="mt-6 max-w-2xl text-gray-600">
          Your login isn't linked to a teacher record yet, so there are no
          classes to show here. Ask your school administrator to create your
          teacher account (Teachers → your profile → Create login account).
        </p>
      )}

      {empNo && !academicYearId && (
        <p className="mt-6 text-gray-600">
          Select an academic year in the header bar to see your classes.
        </p>
      )}

      {empNo && academicYearId && loading && (
        <p className="mt-6 text-gray-500">Loading your classes...</p>
      )}

      {empNo && academicYearId && !loading && cards.length === 0 && (
        <p className="mt-6 text-gray-600">
          No classes are assigned to you for this year yet. An administrator or
          head of department assigns teaching in Teaching Assignments.
        </p>
      )}

      {cards.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={`${c.streamId}|${c.subjectId}`}
              to={`/assessments/marks?form=${c.academicLevelCode}&stream=${c.streamId}&subject=${c.subjectId}`}
              className="rounded-lg bg-white p-5 shadow transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">
                    {c.subjectName}
                  </p>
                  <p className="text-gray-500">
                    {c.academicLevelCode} · {c.streamName}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs ${STAGE_STYLE[c.stage]}`}
                >
                  {STAGE_LABEL[c.stage]}
                </span>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                {c.learners} student{c.learners === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
