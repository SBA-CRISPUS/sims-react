import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useSchool } from "../../schools/hooks/schoolQueries";
import { useOutgoingTransfers } from "../../transfers/hooks/transferQueries";
import { useStudent, useStudentEnrollments } from "../hooks/studentQueries";
import { useLearnerSbaMarks } from "../../assessments/hooks/sbaMarksQueries";
import { useSbaPlans } from "../../assessments/hooks/sbaQueries";
import { resultFor } from "../../../domain/assessments/SbaResultsService";
import type { SbaPlan } from "../../../domain/assessments/SbaPlan";
import { fullName } from "../format";
import SignatureBlock from "../components/SignatureBlock";

const LEVEL_LABEL: Record<string, string> = {
  F1: "Form 1",
  F2: "Form 2",
  F3: "Form 3",
  F4: "Form 4",
};

/**
 * The official TRANSFER REQUEST LETTER handed to the student: school
 * letterhead, formal introduction, enrollment history and SBA record,
 * signed by the Head Teacher. Works for BOTH transfer paths - digital
 * (destination from the transfer request) and manual (destination from
 * the recorded manual transfer); with neither, the destination line is
 * left blank to be completed by hand. Print = hard copy; "Save as PDF"
 * in the print dialog = the soft copy.
 */
export default function TransferLetterPage() {
  const { studentNumber } = useParams<{ studentNumber: string }>();
  const { school: sessionSchool } = useAuth();
  const schoolCode = sessionSchool?.schoolCode;
  const schoolQ = useSchool(schoolCode);
  const school = schoolQ.data ?? sessionSchool; // fresh logo/signature for print

  const studentQ = useStudent(schoolCode, studentNumber);
  const enrollments = useStudentEnrollments(schoolCode, studentNumber);
  const outgoing = useOutgoingTransfers(schoolCode);
  const marks = useLearnerSbaMarks(schoolCode, studentNumber);
  const plans = useSbaPlans(schoolCode);

  const student = studentQ.data;

  // Destination: digital request first (newest, any live status), then
  // the manual record, then a blank line for hand-writing.
  const request = useMemo(
    () =>
      (outgoing.data ?? [])
        .filter(
          (r) =>
            r.studentNumber === studentNumber && r.status !== "cancelled"
        )
        .sort(
          (a, b) =>
            (b.requestedAt?.getTime?.() ?? 0) - (a.requestedAt?.getTime?.() ?? 0)
        )[0],
    [outgoing.data, studentNumber]
  );
  const destination =
    student?.transferredTo?.schoolName ??
    (request ? `School ${request.toSchoolCode}` : undefined);

  const history = useMemo(
    () =>
      [...(enrollments.data ?? [])].sort(
        (a, b) =>
          (a.admissionDate?.getTime() ?? 0) - (b.admissionDate?.getTime() ?? 0)
      ),
    [enrollments.data]
  );
  const firstEnrollment = history[0];
  const lastEnrollment = history[history.length - 1];

  const plansById = useMemo(
    () => new Map<string, SbaPlan>((plans.data ?? []).map((p) => [p.planId, p])),
    [plans.data]
  );
  const sbaRows = useMemo(() => {
    const rows: {
      level: string;
      subjectName: string;
      raw: number;
      band: string;
      frozen: boolean;
    }[] = [];
    for (const m of marks.data ?? []) {
      const plan = plansById.get(m.planId);
      const result = resultFor(m, plan);
      if (!result) continue;
      rows.push({
        level: m.academicLevelCode,
        subjectName: plan?.subjectName ?? m.subjectId,
        raw: result.raw,
        band: result.band,
        frozen: result.frozen,
      });
    }
    return rows.sort(
      (a, b) =>
        a.level.localeCompare(b.level) ||
        a.subjectName.localeCompare(b.subjectName)
    );
  }, [marks.data, plansById]);

  if (studentQ.isLoading) {
    return <div className="p-8 text-gray-500">Loading letter...</div>;
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
          {/* Letterhead */}
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
              {[school?.location?.address, school?.location?.district, school?.location?.province]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p className="text-sm text-gray-600">
              {[school?.contact?.phone, school?.contact?.email]
                .filter(Boolean)
                .join(" · ")}
              {school?.emisCode ? ` · EMIS ${school.emisCode}` : ""}
            </p>
          </div>

          <p className="mt-4 text-right text-sm">{issued}</p>

          <p className="mt-4 text-sm">
            The Head Teacher
            <br />
            {destination ?? (
              <span className="inline-block w-64 border-b border-gray-400">
                &nbsp;
              </span>
            )}
          </p>

          <p className="mt-4 text-sm font-semibold uppercase">
            Re: Request for transfer — {fullName(student)} (
            {student.learnerId ?? student.studentNumber})
          </p>

          <p className="mt-3 text-sm leading-relaxed">
            Dear Sir/Madam,
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            This letter introduces <b>{fullName(student)}</b> ({student.gender}
            {student.dateOfBirth
              ? `, born ${student.dateOfBirth.toLocaleDateString()}`
              : ""}
            ), who has been a student of this school
            {firstEnrollment?.admissionDate
              ? ` since ${firstEnrollment.admissionDate.toLocaleDateString()}`
              : ""}
            {lastEnrollment
              ? `, most recently in ${
                  LEVEL_LABEL[lastEnrollment.academicLevelCode] ??
                  lastEnrollment.academicLevelCode
                }${lastEnrollment.streamId ? ` ${lastEnrollment.streamId}` : ""}`
              : ""}
            . We kindly request that you consider admitting them to your
            school. Their academic record, as held by this school, is set out
            below; the Academic Transcript and Transfer Certificate accompany
            this letter.
          </p>

          {/* Enrollment history */}
          <h2 className="mb-2 mt-6 border-b pb-1 text-base font-semibold">
            Enrollment history
          </h2>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-gray-500 print:bg-white">
                <tr>
                  <th className="p-2">Academic year</th>
                  <th className="p-2">Form</th>
                  <th className="p-2">Class</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((e, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{e.academicYearId}</td>
                    <td className="p-2">
                      {LEVEL_LABEL[e.academicLevelCode] ?? e.academicLevelCode}
                    </td>
                    <td className="p-2">{e.streamId || "—"}</td>
                    <td className="p-2 capitalize">{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SBA record */}
          {sbaRows.length > 0 && (
            <>
              <h2 className="mb-2 mt-6 border-b pb-1 text-base font-semibold">
                School-Based Assessment record (raw marks /100)
              </h2>
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-slate-50 text-gray-500 print:bg-white">
                    <tr>
                      <th className="p-2">Form</th>
                      <th className="p-2">Subject</th>
                      <th className="p-2 text-center">Raw %</th>
                      <th className="p-2">Band</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sbaRows.map((r, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">{LEVEL_LABEL[r.level] ?? r.level}</td>
                        <td className="p-2">{r.subjectName}</td>
                        <td className="p-2 text-center font-medium">{r.raw}</td>
                        <td className="p-2">{r.band}</td>
                        <td className="p-2">
                          {r.frozen ? "final (approved)" : "provisional"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Raw school-based marks; ECZ applies the subject weighting
                centrally. Provisional marks are not yet approved.
              </p>
            </>
          )}

          <p className="mt-6 text-sm leading-relaxed">
            We are grateful for your consideration and remain available for
            any clarification regarding this student's record.
          </p>
          <p className="mt-3 text-sm">Yours faithfully,</p>
          {school?.principal && (
            <p className="mt-1 text-sm font-medium">{school.principal}</p>
          )}

          <SignatureBlock signatureUrl={school?.signatureUrl} issued={issued} />
        </div>
      </div>
    </div>
  );
}
