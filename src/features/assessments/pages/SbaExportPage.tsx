import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useSchool } from "../../schools/hooks/schoolQueries";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useStreams } from "../../academic/hooks/streamQueries";
import { useSubjects } from "../../subjects/hooks/subjectQueries";
import { useSbaSubmissions } from "../hooks/sbaMarksQueries";
import { useSbaPlans } from "../hooks/sbaQueries";
import { useSubjectMarks, useAllStudents } from "../hooks/sbaExportQueries";
import { SBA_LEVELS } from "../../../domain/assessments/SbaPlan";
import { totalMaxMarks } from "../../../domain/assessments/SbaCalculationService";
import type { Student } from "../../../domain/students/Student";
import { downloadCsv } from "../../../lib/csv";

const EXPORTER_ROLES = ["school_admin", "head_teacher", "deputy_head"];

function studentName(s?: Student): string {
  if (!s) return "—";
  return [s.firstName, s.otherNames, s.lastName].filter(Boolean).join(" ");
}

interface ExportRow {
  studentId: string;
  examNo: string;
  name: string;
  streamId: string;
  raw: number | null;
  taskScores: Record<string, number>;
  obtainedTotal: number | null;
  ready: boolean;
  reason?: string;
}

export default function SbaExportPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canExport = EXPORTER_ROLES.includes(profile?.role ?? "");

  // Fresh read so a centre number / deadline saved on the School Profile
  // shows here without a re-login (the session school is cached at login).
  const freshSchool = useSchool(schoolCode);
  const schoolInfo = freshSchool.data ?? school;

  const { academicYear, academicYearId } = useAcademicContext();
  const [form, setForm] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const submissions = useSbaSubmissions(schoolCode);
  const subjects = useSubjects(schoolCode);
  const streams = useStreams(schoolCode);
  const plans = useSbaPlans(schoolCode);
  const subjectMarks = useSubjectMarks(schoolCode, subjectId || undefined);
  const students = useAllStudents(schoolCode);

  // The plan gives the export its per-task columns.
  const plan = (plans.data ?? []).find(
    (p) => p.planId === `${academicYearId}_${form}_${subjectId}`
  );

  const subjectName = (code: string) =>
    subjects.data?.find((s) => s.subjectCode === code)?.name ?? code;
  const streamName = (id: string) =>
    streams.data?.find((s) => s.streamId === id)?.name ?? id;

  // Subjects that have a submission for this year + form.
  const subjectOptions = useMemo(() => {
    const ids = new Set(
      (submissions.data ?? [])
        .filter(
          (s) => s.academicYearId === academicYearId && s.academicLevelCode === form
        )
        .map((s) => s.subjectId)
    );
    return [...ids]
      .map((id) => ({ id, name: subjectName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions.data, academicYearId, form, subjects.data]);

  const studentsById = useMemo(
    () => new Map((students.data ?? []).map((s) => [s.studentNumber, s])),
    [students.data]
  );

  const rows = useMemo<ExportRow[]>(() => {
    if (!academicYearId || !form || !subjectId) return [];
    return (subjectMarks.data ?? [])
      .filter(
        (m) =>
          m.academicYearId === academicYearId &&
          m.academicLevelCode === form &&
          !m.notTaking
      )
      .map((m) => {
        const student = studentsById.get(m.studentId);
        const examNo = student?.examinationNumber ?? "";
        const frozen = typeof m.rawScore === "number";
        const ready = frozen && !!examNo;
        const reason = !frozen
          ? "not approved"
          : !examNo
            ? "no exam number"
            : undefined;
        return {
          studentId: m.studentId,
          examNo,
          name: studentName(student),
          streamId: m.streamId,
          raw: frozen ? (m.rawScore as number) : null,
          taskScores: m.taskScores ?? {},
          obtainedTotal: typeof m.obtainedTotal === "number" ? m.obtainedTotal : null,
          ready,
          reason,
        };
      })
      .sort(
        (a, b) =>
          a.streamId.localeCompare(b.streamId) || a.name.localeCompare(b.name)
      );
  }, [subjectMarks.data, academicYearId, form, subjectId, studentsById]);

  const readyRows = rows.filter((r) => r.ready);
  const missingExam = rows.filter((r) => r.reason === "no exam number").length;
  const notApproved = rows.filter((r) => r.reason === "not approved").length;

  // Two exports: ECZ wants the raw mark only; the school's own copy
  // carries every task score plus obtained/max totals.
  // Header block per the ECZ submission format:
  // Subject / Form / School / Centre Number / Year, then the score rows.
  function exportEczCsv() {
    const rows = [
      ["SUBJECT:", subjectName(subjectId)],
      ["FORM:", form],
      ["SCHOOL:", schoolInfo?.name ?? ""],
      ["CENTRE NUMBER:", schoolInfo?.examCentreNumber ?? ""],
      ["YEAR:", academicYear?.name ?? academicYearId ?? ""],
      [],
      ["Examination Number", "Learner", "Raw Mark"],
      ...readyRows.map((r) => [r.examNo, r.name, String(r.raw ?? "")]),
    ];
    downloadCsv(`SBA_ECZ_${subjectId}_${form}_${academicYearId}.csv`, rows);
  }

  function exportSchoolCsv() {
    const tasks = plan?.tasks ?? [];
    const totalMax = totalMaxMarks(tasks);
    const rows = [
      [
        "Examination Number",
        "Student",
        "Class",
        ...tasks.map((t) => `${t.name} /${t.maxMarks}`),
        `Obtained /${totalMax}`,
        "Raw /100",
      ],
      ...readyRows.map((r) => [
        r.examNo,
        r.name,
        streamName(r.streamId),
        ...tasks.map((t) => String(r.taskScores[t.taskId] ?? "")),
        String(r.obtainedTotal ?? ""),
        String(r.raw ?? ""),
      ]),
    ];
    downloadCsv(`SBA_School_${subjectId}_${form}_${academicYearId}.csv`, rows);
  }

  const ready = !!academicYearId && !!form && !!subjectId;

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold">ECZ SBA Export</h1>
        {academicYear ? (
          <p className="mt-1 text-gray-600">
            {academicYear.name} · raw marks per form-year, keyed by examination
            number
          </p>
        ) : (
          <p className="mt-1 text-gray-600">{school?.name}</p>
        )}
      </div>

      {(schoolInfo?.sbaSubmissionDeadline || !schoolInfo?.examCentreNumber) && (
        <div className="mt-4 space-y-2">
          {schoolInfo?.sbaSubmissionDeadline && (
            <DeadlineBanner
              key={schoolInfo.sbaSubmissionDeadline}
              iso={schoolInfo.sbaSubmissionDeadline}
            />
          )}
          {!schoolInfo?.examCentreNumber && (
            <p className="rounded bg-amber-50 px-4 py-2 text-sm text-amber-800">
              No examination centre number is set — it will be blank on the
              ECZ export. A school administrator can set it on the School
              Profile page (ECZ examinations).
            </p>
          )}
        </div>
      )}

      {!academicYearId && (
        <p className="mt-6 text-gray-600">
          Select an academic year in the header bar to export SBA marks.
        </p>
      )}

      {academicYearId && (
        <div className="mt-6 flex flex-wrap gap-3">
          <select
            value={form}
            onChange={(e) => {
              setForm(e.target.value);
              setSubjectId("");
            }}
            className="rounded border p-2"
          >
            <option value="">Select form...</option>
            {(SBA_LEVELS as readonly string[]).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={!form}
            className="rounded border p-2 disabled:opacity-50"
          >
            <option value="">Select subject...</option>
            {subjectOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {academicYearId && form && subjectOptions.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">
          No SBA submissions for this form yet.
        </p>
      )}

      {ready && (subjectMarks.isLoading || students.isLoading) && (
        <p className="mt-6 text-gray-500">Loading marks...</p>
      )}

      {ready && !subjectMarks.isLoading && !students.isLoading && (
        <>
          <div className="mt-6 flex flex-wrap gap-3">
            <Stat label="Ready to export" value={readyRows.length} tone="green" />
            <Stat label="Missing exam number" value={missingExam} tone="amber" />
            <Stat label="Not yet approved" value={notApproved} tone="slate" />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={exportEczCsv}
              disabled={!canExport || readyRows.length === 0}
              className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-40"
            >
              Export for ECZ ({readyRows.length})
            </button>
            <button
              onClick={exportSchoolCsv}
              disabled={!canExport || readyRows.length === 0 || !plan}
              title={!plan ? "No published plan found for this selection" : undefined}
              className="rounded border border-blue-700 px-4 py-2 text-blue-700 hover:bg-blue-50 disabled:opacity-40"
            >
              School copy (per-task)
            </button>
            <button
              onClick={() => window.print()}
              className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-100"
            >
              Print
            </button>
            {missingExam > 0 && (
              <Link
                to="/assessments/exam-numbers"
                className="self-center text-sm text-blue-700 hover:underline"
              >
                Assign exam numbers →
              </Link>
            )}
          </div>

          <div className="mt-4 rounded-lg bg-white shadow">
            {rows.length === 0 ? (
              <p className="p-6 text-gray-500">No marks for this selection.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-gray-500">
                  <tr>
                    <th className="p-3">Exam No.</th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Class</th>
                    <th className="p-3 text-center">Raw Mark</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.studentId} className="border-b">
                      <td className="p-3 font-mono text-xs">
                        {r.examNo || "—"}
                      </td>
                      <td className="p-3">{r.name}</td>
                      <td className="p-3">{streamName(r.streamId)}</td>
                      <td className="p-3 text-center font-medium">
                        {r.raw ?? "—"}
                      </td>
                      <td className="p-3 text-xs">
                        {r.ready ? (
                          <span className="text-green-700">ready</span>
                        ) : (
                          <span className="text-amber-700">{r.reason}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="p-3 text-xs text-gray-500">
              Only approved (frozen) students with an examination number are
              exported. "Export for ECZ" carries the raw mark only (the
              30%/40% weighting is applied centrally); "School copy" adds
              every task score and the obtained total for the school's own
              records.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function DeadlineBanner({ iso }: { iso: string }) {
  // Lazy initializer: "today" and the locale-formatted date are captured
  // once per mount (the parent keys this component by the iso date).
  const [info] = useState(() => {
    const deadline = new Date(`${iso}T23:59:59`);
    if (Number.isNaN(deadline.getTime())) return null;
    return {
      days: Math.ceil((deadline.getTime() - Date.now()) / 86_400_000),
      text: deadline.toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
  });
  if (!info) return null;
  const { days, text } = info;
  const tone =
    days < 0
      ? "bg-red-50 text-red-800"
      : days <= 30
        ? "bg-amber-50 text-amber-800"
        : "bg-slate-50 text-slate-700";
  return (
    <p className={`rounded px-4 py-2 text-sm ${tone}`}>
      {days < 0
        ? `The ECZ SBA submission deadline (${text}) has passed.`
        : `SBA scores are due to ECZ by ${text} (${days} day${days === 1 ? "" : "s"} left).`}
    </p>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "slate";
}) {
  const tones = {
    green: "bg-green-50 text-green-800",
    amber: "bg-amber-50 text-amber-800",
    slate: "bg-slate-50 text-slate-700",
  };
  return (
    <div className={`rounded-lg px-5 py-3 ${tones[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}
