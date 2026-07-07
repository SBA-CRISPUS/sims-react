import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useSchool } from "../../schools/hooks/schoolQueries";
import { useSubjects } from "../../subjects/hooks/subjectQueries";
import { useSbaPlans } from "../../assessments/hooks/sbaQueries";
import { useStreamSbaMarks } from "../../assessments/hooks/sbaMarksQueries";
import { useTerms } from "../../academic/hooks/streamQueries";
import { useFeeStatus } from "../../finance/hooks/financeQueries";
import { useStudent, useStudentEnrollments } from "../hooks/studentQueries";
import { fullName } from "../format";
import { resultFor } from "../../../domain/assessments/SbaResultsService";
import { sbaRawOutOf100 } from "../../../domain/assessments/SbaCalculationService";
import {
  classStats,
  learnerAverage,
  rankPositions,
} from "../../../domain/assessments/SbaStatsService";
import { DEFAULT_GRADING_SCALE, gradeFor } from "../../schools/types";
import type { ClassStats } from "../../../domain/assessments/SbaStatsService";
import type { SbaPlan } from "../../../domain/assessments/SbaPlan";
import type { SbaMark } from "../../../domain/assessments/SbaMark";

const LEVEL_LABEL: Record<string, string> = {
  F1: "Form 1",
  F2: "Form 2",
  F3: "Form 3",
  F4: "Form 4",
};

const POINT_LABELS = ["Midterm", "End of term"] as const;

// Managers see a withheld card with a notice; teachers don't see it at all.
const FEE_OVERRIDE_ROLES = ["school_admin", "head_teacher"];

interface Row {
  subjectId: string;
  subjectName: string;
  raw: number;
  frozen: boolean;
  stats: ClassStats | null;
}

function streamCodeOf(streamId: string): string {
  const dash = streamId.indexOf("-");
  return dash >= 0 ? streamId.slice(dash + 1) : streamId;
}

/**
 * The learner's REPORT CARD: their SBA scores next to the class average,
 * with the school's own calculations (overall average, class position) and
 * the school's grading scale printed as a legend for parents.
 *
 * The reporting period is selectable: the whole year (frozen-aware), or
 * one term - scores then computed over that term's tagged tasks only -
 * optionally labelled Midterm / End of term (e.g. "Term 2 — Midterm").
 *
 * For PRIVATE schools the card is gated on fee clearance (Payments page):
 * not cleared -> teachers are blocked, admin/head see a withhold notice.
 * Government schools are fee-free by law - never gated.
 */
export default function ReportCardPage() {
  const { studentNumber } = useParams<{ studentNumber: string }>();
  const { school: sessionSchool, profile } = useAuth();
  const schoolCode = sessionSchool?.schoolCode;

  // Fresh read: logo / grading scale / ownership may have changed since login.
  const schoolQ = useSchool(schoolCode);
  const school = schoolQ.data ?? sessionSchool;

  const studentQ = useStudent(schoolCode, studentNumber);
  const enrollments = useStudentEnrollments(schoolCode, studentNumber);
  const plans = useSbaPlans(schoolCode);
  const subjects = useSubjects(schoolCode);

  const [termId, setTermId] = useState(""); // "" = whole year
  const [point, setPoint] = useState("");

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
  const terms = useTerms(schoolCode, enrollment?.academicYearId);
  const feeStatus = useFeeStatus(
    school?.ownership === "Private" ? schoolCode : undefined,
    enrollment?.academicYearId,
    studentNumber
  );

  const plansById = useMemo(
    () => new Map<string, SbaPlan>((plans.data ?? []).map((p) => [p.planId, p])),
    [plans.data]
  );

  const classMarkList = classMarks.data;
  const subjectList = subjects.data;

  // Term options = the terms actually tagged on this class's plan tasks.
  const termOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const m of classMarkList ?? []) {
      const plan = plansById.get(m.planId);
      for (const t of plan?.tasks ?? []) {
        if (t.termId) ids.add(t.termId);
      }
    }
    return [...ids]
      .map((id) => ({
        id,
        name: terms.data?.find((t) => t.termId === id)?.name ?? id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classMarkList, plansById, terms.data]);

  // Every classmate's per-subject results for the selected period.
  const { rows, average, position, classSize, classAverage } = useMemo(() => {
    const yearMarks = (classMarkList ?? []).filter(
      (m) => m.academicYearId === enrollment?.academicYearId && !m.notTaking
    );

    // Whole year: frozen-aware. Term view: live calc over the term's tasks.
    const scoreOf = (m: SbaMark): { raw: number; frozen: boolean } | null => {
      const plan = plansById.get(m.planId);
      if (!plan) return null;
      if (!termId) {
        const r = resultFor(m, plan);
        return r ? { raw: r.raw, frozen: r.frozen } : null;
      }
      const termTasks = plan.tasks.filter((t) => t.termId === termId);
      if (termTasks.length === 0) return null; // subject not assessed this term
      return { raw: sbaRawOutOf100(m.taskScores, termTasks), frozen: false };
    };

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
  }, [classMarkList, enrollment, plansById, subjectList, studentNumber, termId]);

  const student = studentQ.data;
  if (
    studentQ.isLoading ||
    enrollments.isLoading ||
    classMarks.isLoading ||
    // Never flash a withheld card while the clearance check is in flight.
    (school?.ownership === "Private" && feeStatus.isLoading)
  ) {
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

  // ---- Fee clearance gate (private schools only). ----
  const feeGated =
    school?.ownership === "Private" &&
    !feeStatus.isLoading &&
    feeStatus.data?.cleared !== true;
  const canOverride = FEE_OVERRIDE_ROLES.includes(profile?.role ?? "");

  if (feeGated && !canOverride) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-md rounded-lg border border-amber-300 bg-amber-50 p-6">
          <p className="font-medium text-amber-900">Report card withheld</p>
          <p className="mt-2 text-sm text-amber-800">
            This learner's school fees are not marked as cleared for{" "}
            {enrollment?.academicYearId ?? "this year"}, so the report card
            can't be viewed. Please contact the school office.
          </p>
          <Link
            to={`/students/${studentNumber}`}
            className="mt-4 inline-block text-sm text-blue-700 hover:underline"
          >
            ← Back to profile
          </Link>
        </div>
      </div>
    );
  }

  const scale = school?.gradingScale?.length
    ? school.gradingScale
    : DEFAULT_GRADING_SCALE;
  const termName = termId
    ? (termOptions.find((t) => t.id === termId)?.name ?? termId)
    : "";
  const periodLabel = termId
    ? `${termName}${point ? ` — ${point}` : ""}`
    : "Whole year";
  const issued = new Date().toLocaleDateString();

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            to={`/students/${studentNumber}`}
            className="text-sm text-blue-700 hover:underline"
          >
            ← Back to profile
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={termId}
              onChange={(e) => {
                setTermId(e.target.value);
                if (!e.target.value) setPoint("");
              }}
              className="rounded border p-2 text-sm"
            >
              <option value="">Whole year</option>
              {termOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={point}
              onChange={(e) => setPoint(e.target.value)}
              disabled={!termId}
              className="rounded border p-2 text-sm disabled:opacity-50"
            >
              <option value="">— point —</option>
              {POINT_LABELS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              onClick={() => window.print()}
              className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
            >
              Print / Save as PDF
            </button>
          </div>
        </div>
        {termOptions.length === 0 && (
          <p className="mt-2 text-xs text-gray-500 print:hidden">
            Tip: tag each task with a Term in the SBA plan to produce
            per-term report cards (e.g. Term 2 — Midterm).
          </p>
        )}

        {feeGated && canOverride && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 print:hidden">
            <strong>Fees not cleared</strong> for{" "}
            {enrollment?.academicYearId ?? "this year"} — this report card
            should be withheld from the learner's family until the office
            clears them on the{" "}
            <Link to="/finance/payments" className="text-blue-700 underline">
              Payments
            </Link>{" "}
            page.
          </div>
        )}

        <div className="mt-4 rounded-lg border bg-white p-8 shadow print:border-0 print:shadow-none">
          {/* School header */}
          <div className="border-b pb-4 text-center">
            {school?.logoUrl && (
              <img
                src={school.logoUrl}
                alt=""
                className="mx-auto mb-2 h-16 w-16 object-contain"
              />
            )}
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
                {streamCodeOf(enrollment.streamId || "")} ·{" "}
                <span className="font-medium">{periodLabel}</span>
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
            School-Based Assessment — {periodLabel}
          </h2>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">
              No SBA scores recorded for this
              {termId ? " term" : " class year"}
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
                  <th className="py-1">Grade</th>
                  <th className="py-1 text-center">Class Avg</th>
                  <th className="py-1 text-center">Class Range</th>
                  {!termId && <th className="py-1">Status</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.subjectId} className="border-b">
                    <td className="py-1">{r.subjectName}</td>
                    <td className="py-1 text-center font-medium">{r.raw}</td>
                    <td className="py-1">{gradeFor(r.raw, scale)}</td>
                    <td className="py-1 text-center">{r.stats?.mean ?? "—"}</td>
                    <td className="py-1 text-center">
                      {r.stats ? `${r.stats.min}–${r.stats.max}` : "—"}
                    </td>
                    {!termId && (
                      <td className="py-1">
                        {r.frozen ? "final" : "provisional"}
                      </td>
                    )}
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
            {termId
              ? "Term scores are the school's own calculation over that term's assessment tasks."
              : "Scores are raw school-based marks out of 100."}{" "}
            Averages and positions are the school's own calculations; ECZ
            receives raw marks only and applies the official subject
            weighting centrally.
          </p>

          {/* Grading scale legend */}
          <div className="mt-4 rounded border border-slate-200 p-3">
            <p className="text-xs font-semibold text-gray-600">
              Grading scale
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {scale
                .map((b) => `${b.min}–${b.max} ${b.label}`)
                .join("  ·  ")}
            </p>
          </div>

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
