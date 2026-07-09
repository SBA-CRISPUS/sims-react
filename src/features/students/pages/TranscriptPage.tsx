import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useSchool } from "../../schools/hooks/schoolQueries";
import { useSubjects } from "../../subjects/hooks/subjectQueries";
import { useSbaPlans } from "../../assessments/hooks/sbaQueries";
import { useLearnerSbaMarks } from "../../assessments/hooks/sbaMarksQueries";
import { useStudent, useStudentEnrollments } from "../hooks/studentQueries";
import { fullName } from "../format";
import {
  resultFor,
  combinedOutOf20,
} from "../../../domain/assessments/SbaResultsService";
import type { SbaResult } from "../../../domain/assessments/SbaResultsService";
import type { SbaPlan } from "../../../domain/assessments/SbaPlan";

const LEVEL_LABEL: Record<string, string> = { F2: "Form 2", F3: "Form 3" };

interface Row {
  subjectId: string;
  subjectName: string;
  result: SbaResult;
}

export default function TranscriptPage() {
  const { studentNumber } = useParams<{ studentNumber: string }>();
  const { school: sessionSchool } = useAuth();
  const schoolCode = sessionSchool?.schoolCode;
  const schoolQ = useSchool(schoolCode);
  const school = schoolQ.data ?? sessionSchool; // fresh logo/details for print

  const studentQ = useStudent(schoolCode, studentNumber);
  const enrollments = useStudentEnrollments(schoolCode, studentNumber);
  const marks = useLearnerSbaMarks(schoolCode, studentNumber);
  const plans = useSbaPlans(schoolCode);
  const subjects = useSubjects(schoolCode);

  const plansById = useMemo(
    () => new Map<string, SbaPlan>((plans.data ?? []).map((p) => [p.planId, p])),
    [plans.data]
  );
  const subjectName = (planId: string, code: string) =>
    plansById.get(planId)?.subjectName ??
    subjects.data?.find((s) => s.subjectCode === code)?.name ??
    code;

  const byLevel = useMemo(() => {
    const groups = new Map<string, Row[]>();
    for (const m of marks.data ?? []) {
      const result = resultFor(m, plansById.get(m.planId));
      if (!result) continue;
      const list = groups.get(m.academicLevelCode) ?? [];
      list.push({
        subjectId: m.subjectId,
        subjectName: subjectName(m.planId, m.subjectId),
        result,
      });
      groups.set(m.academicLevelCode, list);
    }
    for (const list of groups.values())
      list.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks.data, plansById, subjects.data]);

  const combinedRows = useMemo(() => {
    const bySubject = new Map<
      string,
      { name: string; f2: number | null; f3: number | null }
    >();
    for (const [level, rows] of byLevel) {
      for (const r of rows) {
        const entry =
          bySubject.get(r.subjectId) ?? { name: r.subjectName, f2: null, f3: null };
        if (level === "F2") entry.f2 = r.result.raw;
        if (level === "F3") entry.f3 = r.result.raw;
        bySubject.set(r.subjectId, entry);
      }
    }
    return [...bySubject.values()]
      .filter((e) => e.f2 !== null && e.f3 !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [byLevel]);

  const student = studentQ.data;
  if (studentQ.isLoading) {
    return <div className="p-8 text-gray-500">Loading transcript...</div>;
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

  const levels = [...byLevel.keys()].sort();
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
              ACADEMIC TRANSCRIPT
            </p>
          </div>

          {/* Learner identity */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Detail label="Student" value={fullName(student)} />
            <Detail label="SIMS Learner ID" value={student.learnerId ?? "—"} />
            <Detail label="Student No." value={student.studentNumber} />
            <Detail label="Examination No." value={student.examinationNumber ?? "—"} />
            <Detail label="Gender" value={student.gender} />
            <Detail
              label="Date of Birth"
              value={
                student.dateOfBirth
                  ? student.dateOfBirth.toLocaleDateString()
                  : "—"
              }
            />
          </div>

          {/* Enrollment history */}
          <Heading>Enrollment history</Heading>
          {(enrollments.data ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">None recorded.</p>
          ) : (
            <div className="overflow-x-auto print:overflow-visible"><table className="w-full text-left text-sm">
              <thead className="border-b text-gray-500">
                <tr>
                  <th className="py-1">Year</th>
                  <th className="py-1">Level</th>
                  <th className="py-1">Stream</th>
                  <th className="py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...(enrollments.data ?? [])]
                  .sort((a, b) =>
                    a.academicYearId.localeCompare(b.academicYearId)
                  )
                  .map((e, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-1">{e.academicYearId}</td>
                      <td className="py-1">{e.academicLevelCode}</td>
                      <td className="py-1">{e.streamId || "—"}</td>
                      <td className="py-1 capitalize">{e.status}</td>
                    </tr>
                  ))}
              </tbody>
            </table></div>
          )}

          {/* SBA results */}
          <Heading>School-Based Assessment (SBA)</Heading>
          {levels.length === 0 ? (
            <p className="text-sm text-gray-500">No SBA results recorded.</p>
          ) : (
            levels.map((level) => (
              <div key={level} className="mb-4">
                <p className="text-sm font-semibold">
                  {LEVEL_LABEL[level] ?? level}
                </p>
                <div className="overflow-x-auto print:overflow-visible"><table className="w-full text-left text-sm">
                  <thead className="border-b text-gray-500">
                    <tr>
                      <th className="py-1">Subject</th>
                      <th className="py-1 text-center">Raw %</th>
                      <th className="py-1">Band</th>
                      <th className="py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byLevel.get(level)!.map((r) => (
                      <tr key={r.subjectId} className="border-b">
                        <td className="py-1">{r.subjectName}</td>
                        <td className="py-1 text-center">{r.result.raw}</td>
                        <td className="py-1">{r.result.band}</td>
                        <td className="py-1">
                          {r.result.frozen ? "final" : r.result.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </div>
            ))
          )}

          {combinedRows.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold">Combined SBA (Forms 2 + 3)</p>
              <div className="overflow-x-auto print:overflow-visible"><table className="w-full text-left text-sm">
                <thead className="border-b text-gray-500">
                  <tr>
                    <th className="py-1">Subject</th>
                    <th className="py-1 text-center">Form 2 /10</th>
                    <th className="py-1 text-center">Form 3 /10</th>
                    <th className="py-1 text-center">Combined /20</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedRows.map((e) => (
                    <tr key={e.name} className="border-b">
                      <td className="py-1">{e.name}</td>
                      <td className="py-1 text-center">
                        {Math.round((e.f2 ?? 0) / 10)}
                      </td>
                      <td className="py-1 text-center">
                        {Math.round((e.f3 ?? 0) / 10)}
                      </td>
                      <td className="py-1 text-center font-medium">
                        {combinedOutOf20(e.f2, e.f3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          )}

          <p className="mt-2 text-xs text-gray-500">
            SBA marks are raw school-based scores; ECZ applies the subject
            weighting (30%/40%) centrally, and competency bands here are
            provisional (the ECZ grade combines SBA with the Form 4 exam).
          </p>

          {/* Signature */}
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

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 mt-6 border-b pb-1 text-base font-semibold">
      {children}
    </h2>
  );
}
