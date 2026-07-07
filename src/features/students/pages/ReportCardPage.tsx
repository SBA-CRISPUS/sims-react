import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useSubjects } from "../../subjects/hooks/subjectQueries";
import { useSbaPlans } from "../../assessments/hooks/sbaQueries";
import { useStreamSbaMarks } from "../../assessments/hooks/sbaMarksQueries";
import { useStudent, useStudentEnrollments } from "../hooks/studentQueries";
import { fullName } from "../format";
import { resultFor } from "../../../domain/assessments/SbaResultsService";
import {
  classStats,
  learnerAverage,
  rankPositions,
} from "../../../domain/assessments/SbaStatsService";
import type { ClassStats } from "../../../domain/assessments/SbaStatsService";
import type { SbaPlan } from "../../../domain/assessments/SbaPlan";
import type { SbaMark } from "../../../domain/assessments/SbaMark";

const LEVEL_LABEL: Record<string, string> = {
  F1: "Form 1",
  F2: "Form 2",
  F3: "Form 3",
  F4: "Form 4",
};

interface Row {
  subjectId: string;
  subjectName: string;
  raw: number;
  band: string;
  frozen: boolean;
  stats: ClassStats | null;
}

function streamCodeOf(streamId: string): string {
  const dash = streamId.indexOf("-");
  return dash >= 0 ? streamId.slice(dash + 1) : streamId;
}

/**
 * The learner's REPORT CARD for one school year: their SBA scores next to
 * the class average, plus the school's own calculations (overall average,
 * class position). These calculations are the school's internal view -
 * ECZ still receives raw marks only.
 */
export default function ReportCardPage() {
  const { studentNumber } = useParams<{ studentNumber: string }>();
  const { school } = useAuth();
  const schoolCode = school?.schoolCode;

  const studentQ = useStudent(schoolCode, studentNumber);
  const enrollments = useStudentEnrollments(schoolCode, studentNumber);
  const plans = useSbaPlans(schoolCode);
  const subjects = useSubjects(schoolCode);

  // The report-card year = the learner's current (newest) enrollment.
  const enrollment = useMemo(
    () =>
      [...(enrollments.data ?? [])].sort(
        (a, b) =>
          (b.admissionDate?.getTime() ?? 0) - (a.admissionDate?.getTime() ?? 0)
      )[0],
    [enrollments.data]
  );
  const compositeStreamId = enrollment?.streamId
    ? `${enrollment.academicLevelCode}-${streamCodeOf(
        enrollment.streamId
      ).toUpperCase()}`
    : undefined;

  const classMarks = useStreamSbaMarks(schoolCode, compositeStreamId);

  const plansById = useMemo(
    () => new Map<string, SbaPlan>((plans.data ?? []).map((p) => [p.planId, p])),
    [plans.data]
  );

  const classMarkList = classMarks.data;
  const subjectList = subjects.data;

  // Every classmate's per-subject results for the year, in one pass.
  const { rows, average, position, classSize, classAverage } = useMemo(() => {
    const yearMarks = (classMarkList ?? []).filter(
      (m) => m.academicYearId === enrollment?.academicYearId && !m.notTaking
    );

    const scoreOf = (m: SbaMark) => resultFor(m, plansById.get(m.planId));

    const bySubject = new Map<string, SbaMark[]>();
    const byStudent = new Map<string, number[]>();
    for (const m of yearMarks) {
      const result = scoreOf(m);
      if (!result) continue;
      bySubject.set(m.subjectId, [...(bySubject.get(m.subjectId) ?? []), m]);
      byStudent.set(m.studentId, [
        ...(byStudent.get(m.studentId) ?? []),
        result.raw,
      ]);
    }

    const subjectName = (planId: string, code: string) =>
      plansById.get(planId)?.subjectName ??
      subjectList?.find((s) => s.subjectCode === code)?.name ??
      code;

    const rows: Row[] = [];
    for (const [subjectId, marks] of bySubject) {
      const mine = marks.find((m) => m.studentId === studentNumber);
      if (!mine) continue;
      const result = scoreOf(mine);
      if (!result) continue;
      const classScores = marks
        .map((m) => scoreOf(m)?.raw)
        .filter((r): r is number => typeof r === "number");
      rows.push({
        subjectId,
        subjectName: subjectName(mine.planId, subjectId),
        raw: result.raw,
        band: result.band,
        frozen: result.frozen,
        stats: classStats(classScores),
      });
    }
    rows.sort((a, b) => a.subjectName.localeCompare(b.subjectName));

    const averages = new Map<string, number>();
    for (const [studentId, scores] of byStudent) {
      const avg = learnerAverage(scores);
      if (avg !== null) averages.set(studentId, avg);
    }
    const positions = rankPositions(averages);
    const allAverages = [...averages.values()];

    return {
      rows,
      average: studentNumber ? (averages.get(studentNumber) ?? null) : null,
      position: studentNumber ? (positions.get(studentNumber) ?? null) : null,
      classSize: averages.size,
      classAverage: learnerAverage(allAverages),
    };
  }, [classMarkList, enrollment, plansById, subjectList, studentNumber]);

  const student = studentQ.data;
  if (studentQ.isLoading || enrollments.isLoading || classMarks.isLoading) {
    return <div className="p-8 text-gray-500">Loading report card...</div>;
  }
  if (!student || !studentNumber) {
    return (
      <div className="p-8">
        <p className="text-red-600">Student not found.</p>
        <Link to="/students" className="text-blue-700 hover:underline">
          Back to Students
        </Link>
      </div>
    );
  }

  const issued = new Date().toLocaleDateString();

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between print:hidden">
          <Link
            to={`/students/${studentNumber}`}
            className="text-sm text-blue-700 hover:underline"
          >
            ← Back to profile
          </Link>
          <button
            onClick={() => window.print()}
            className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
          >
            Print / Save as PDF
          </button>
        </div>

        <div className="mt-4 rounded-lg border bg-white p-8 shadow print:border-0 print:shadow-none">
          {/* School header */}
          <div className="border-b pb-4 text-center">
            <h1 className="text-2xl font-bold">{school?.name ?? "School"}</h1>
            <p className="text-sm text-gray-600">
              {[school?.location?.district, school?.location?.province]
                .filter(Boolean)
                .join(", ")}
              {school?.emisCode ? ` · EMIS ${school.emisCode}` : ""}
            </p>
            <p className="mt-2 text-lg font-semibold tracking-wide">
              LEARNER REPORT CARD
            </p>
            {enrollment && (
              <p className="text-sm text-gray-600">
                {enrollment.academicYearId} ·{" "}
                {LEVEL_LABEL[enrollment.academicLevelCode] ??
                  enrollment.academicLevelCode}{" "}
                {streamCodeOf(enrollment.streamId || "")}
              </p>
            )}
          </div>

          {/* Learner identity */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Detail label="Learner" value={fullName(student)} />
            <Detail label="SIMS Learner ID" value={student.learnerId ?? "—"} />
            <Detail label="Student No." value={student.studentNumber} />
            <Detail
              label="Examination No."
              value={student.examinationNumber ?? "—"}
            />
          </div>

          {/* Subject results */}
          <h2 className="mb-2 mt-6 border-b pb-1 text-base font-semibold">
            School-Based Assessment
          </h2>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">
              No SBA scores recorded for this class year
              {enrollment && !enrollment.streamId
                ? " — the learner has no class placement yet"
                : ""}
              .
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b text-gray-500">
                <tr>
                  <th className="py-1">Subject</th>
                  <th className="py-1 text-center">Score /100</th>
                  <th className="py-1">Band</th>
                  <th className="py-1 text-center">Class Avg</th>
                  <th className="py-1 text-center">Class Range</th>
                  <th className="py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.subjectId} className="border-b">
                    <td className="py-1">{r.subjectName}</td>
                    <td className="py-1 text-center font-medium">{r.raw}</td>
                    <td className="py-1">{r.band}</td>
                    <td className="py-1 text-center">{r.stats?.mean ?? "—"}</td>
                    <td className="py-1 text-center">
                      {r.stats ? `${r.stats.min}–${r.stats.max}` : "—"}
                    </td>
                    <td className="py-1">{r.frozen ? "final" : "provisional"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* School calculations */}
          {rows.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <Summary label="Overall average" value={average ?? "—"} />
              <Summary
                label="Class position"
                value={position ? `${position} of ${classSize}` : "—"}
              />
              <Summary label="Class average" value={classAverage ?? "—"} />
            </div>
          )}

          <p className="mt-3 text-xs text-gray-500">
            Scores are raw school-based marks out of 100; averages and
            positions are the school's own calculations. ECZ receives raw
            marks only and applies the official subject weighting centrally.
          </p>

          {/* Remarks + signatures */}
          <div className="mt-8 space-y-6 text-sm">
            <div>
              <p className="text-gray-500">Class teacher's remarks</p>
              <div className="mt-4 border-b border-gray-300" />
            </div>
            <div>
              <p className="text-gray-500">Head teacher's remarks</p>
              <div className="mt-4 border-b border-gray-300" />
            </div>
          </div>
          <div className="mt-10 flex items-end justify-between">
            <div>
              <div className="h-10 w-48 border-b border-gray-400" />
              <p className="mt-1 text-sm">Head Teacher signature &amp; stamp</p>
            </div>
            <p className="text-sm text-gray-600">Issued: {issued}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-slate-200 px-3 py-2">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
