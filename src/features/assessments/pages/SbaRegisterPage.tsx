import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useStreams } from "../../academic/hooks/streamQueries";
import { useSbaPlans } from "../hooks/sbaQueries";
import { useSbaRoster, useSbaMarks } from "../hooks/sbaMarksQueries";
import { sbaSubmissionId } from "../../../domain/assessments/SbaSubmission";
import { resultFor } from "../../../domain/assessments/SbaResultsService";
import type { Student } from "../../../domain/students/Student";

function studentName(s: Student): string {
  return [s.firstName, s.otherNames, s.lastName].filter(Boolean).join(" ");
}

export default function SbaRegisterPage() {
  const { school } = useAuth();
  const schoolCode = school?.schoolCode;
  const { academicYear, academicYearId } = useAcademicContext();

  const [params] = useSearchParams();
  const form = params.get("form") ?? "";
  const streamId = params.get("stream") ?? "";
  const subjectId = params.get("subject") ?? "";

  const plans = useSbaPlans(schoolCode);
  const streams = useStreams(schoolCode);

  const plan = (plans.data ?? []).find(
    (p) =>
      p.academicYearId === academicYearId &&
      p.academicLevelCode === form &&
      p.subjectId === subjectId
  );
  const streamName =
    streams.data?.find((s) => s.streamId === streamId)?.name ?? streamId;

  const submissionId =
    academicYearId && streamId && subjectId
      ? sbaSubmissionId({ academicYearId, streamId, subjectId })
      : undefined;

  const roster = useSbaRoster(schoolCode, academicYearId, streamId);
  const marks = useSbaMarks(schoolCode, submissionId);

  const markByStudent = useMemo(
    () => new Map((marks.data ?? []).map((m) => [m.studentId, m])),
    [marks.data]
  );

  const ready = !!academicYearId && !!form && !!streamId && !!subjectId;

  return (
    <div className="p-8">
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/assessments/readiness"
            className="text-sm text-blue-700 hover:underline"
          >
            ← Back to Readiness
          </Link>
          <h1 className="mt-2 text-3xl font-bold">
            {plan?.subjectName ?? subjectId} · {form}
            {streamName ? ` ${streamName}` : ""}
          </h1>
          <p className="mt-1 text-gray-600">
            SBA Register{academicYear ? ` · ${academicYear.name}` : ""} ·{" "}
            {school?.name}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-100"
        >
          Print
        </button>
      </div>

      {!ready && (
        <p className="mt-6 text-gray-600">
          Open a register from the SBA Readiness board or SBA Review.
        </p>
      )}

      {ready && !plan && (
        <p className="mt-6 text-amber-700">
          No published SBA plan for this class.
        </p>
      )}

      {ready && plan && (
        <div className="mt-6 rounded-lg bg-white shadow">
          {(roster.isLoading || marks.isLoading) && (
            <p className="p-6 text-gray-500">Loading register...</p>
          )}
          {!roster.isLoading && (roster.data ?? []).length === 0 && (
            <p className="p-6 text-gray-500">
              No learners enrolled in this class.
            </p>
          )}
          {(roster.data ?? []).length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-gray-500">
                <tr>
                  <th className="p-3">Exam No.</th>
                  <th className="p-3">Learner</th>
                  <th className="p-3 text-center">Raw %</th>
                  <th className="p-3">Band</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(roster.data ?? []).map((s) => {
                  const mark = markByStudent.get(s.studentNumber);
                  const result = mark ? resultFor(mark, plan) : null;
                  return (
                    <tr key={s.studentNumber} className="border-b">
                      <td className="p-3 font-mono text-xs">
                        {s.examinationNumber ?? "—"}
                      </td>
                      <td className="p-3">{studentName(s)}</td>
                      <td className="p-3 text-center font-medium">
                        {mark?.notTaking ? "—" : (result?.raw ?? "—")}
                      </td>
                      <td className="p-3">
                        {mark?.notTaking ? "Not taking" : (result?.band ?? "—")}
                      </td>
                      <td className="p-3 text-xs text-gray-500">
                        {mark?.notTaking
                          ? "excluded"
                          : result?.frozen
                            ? `frozen · ${result.status}`
                            : (result?.status ?? "not entered")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="p-3 text-xs text-gray-500">
            Raw marks (out of the plan's {plan.totalMaxMarks}) normalised to
            100. ECZ applies the subject weighting centrally.
          </p>
        </div>
      )}
    </div>
  );
}
