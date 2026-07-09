import { useMemo } from "react";

import { useSbaPlans } from "../../../assessments/hooks/sbaQueries";
import { useLearnerSbaMarks } from "../../../assessments/hooks/sbaMarksQueries";
import {
  resultFor,
  combinedOutOf20,
} from "../../../../domain/assessments/SbaResultsService";
import type { SbaResult } from "../../../../domain/assessments/SbaResultsService";
import type { SbaPlan } from "../../../../domain/assessments/SbaPlan";

interface Props {
  schoolCode: string;
  studentNumber: string;
}

interface Row {
  subjectId: string;
  subjectName: string;
  result: SbaResult;
}

const LEVEL_LABEL: Record<string, string> = { F2: "Form 2", F3: "Form 3" };

export default function SbaTab({ schoolCode, studentNumber }: Props) {
  const marks = useLearnerSbaMarks(schoolCode, studentNumber);
  const plans = useSbaPlans(schoolCode);

  const plansById = useMemo(
    () => new Map<string, SbaPlan>((plans.data ?? []).map((p) => [p.planId, p])),
    [plans.data]
  );

  const byLevel = useMemo(() => {
    const groups = new Map<string, Row[]>();
    for (const m of marks.data ?? []) {
      const plan = plansById.get(m.planId);
      const result = resultFor(m, plan);
      if (!result) continue; // not taking
      const row: Row = {
        subjectId: m.subjectId,
        subjectName: plan?.subjectName ?? m.subjectId,
        result,
      };
      const list = groups.get(m.academicLevelCode) ?? [];
      list.push(row);
      groups.set(m.academicLevelCode, list);
    }
    for (const list of groups.values())
      list.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
    return groups;
  }, [marks.data, plansById]);

  const combinedRows = useMemo(() => {
    const bySubject = new Map<
      string,
      { name: string; f2: number | null; f3: number | null }
    >();
    for (const [level, rows] of byLevel) {
      for (const r of rows) {
        const entry =
          bySubject.get(r.subjectId) ?? {
            name: r.subjectName,
            f2: null,
            f3: null,
          };
        if (level === "F2") entry.f2 = r.result.raw;
        if (level === "F3") entry.f3 = r.result.raw;
        bySubject.set(r.subjectId, entry);
      }
    }
    return [...bySubject.values()]
      .filter((e) => e.f2 !== null && e.f3 !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [byLevel]);

  if (marks.isLoading || plans.isLoading) {
    return <p className="text-gray-500">Loading SBA results...</p>;
  }
  if (byLevel.size === 0) {
    return <p className="text-gray-500">No SBA marks recorded for this student yet.</p>;
  }

  const levels = [...byLevel.keys()].sort();

  return (
    <div className="space-y-6">
      {levels.map((level) => (
        <div key={level}>
          <h3 className="mb-2 font-semibold">
            {LEVEL_LABEL[level] ?? level}
          </h3>
          <ResultTable rows={byLevel.get(level)!} />
        </div>
      ))}

      {combinedRows.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">Combined SBA (Forms 2 + 3)</h3>
          <div className="overflow-x-auto print:overflow-visible"><table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-gray-500">
              <tr>
                <th className="p-2">Subject</th>
                <th className="p-2 text-center">Form 2 /10</th>
                <th className="p-2 text-center">Form 3 /10</th>
                <th className="p-2 text-center">Combined /20</th>
              </tr>
            </thead>
            <tbody>
              {combinedRows.map((e) => (
                <tr key={e.name} className="border-b">
                  <td className="p-2">{e.name}</td>
                  <td className="p-2 text-center">{Math.round((e.f2 ?? 0) / 10)}</td>
                  <td className="p-2 text-center">{Math.round((e.f3 ?? 0) / 10)}</td>
                  <td className="p-2 text-center font-medium">
                    {combinedOutOf20(e.f2, e.f3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Raw school-based marks. ECZ applies the subject weighting (30% or 40%)
        centrally; competency bands here are provisional (the ECZ grade
        combines SBA with the Form 4 exam).
      </p>
    </div>
  );
}

function ResultTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto print:overflow-visible"><table className="w-full text-left text-sm">
      <thead className="border-b bg-slate-50 text-gray-500">
        <tr>
          <th className="p-2">Subject</th>
          <th className="p-2 text-center">Raw %</th>
          <th className="p-2">Band</th>
          <th className="p-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.subjectId} className="border-b">
            <td className="p-2">{r.subjectName}</td>
            <td className="p-2 text-center font-medium">{r.result.raw}</td>
            <td className="p-2">{r.result.band}</td>
            <td className="p-2">
              {r.result.frozen ? (
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                  frozen · {r.result.status}
                </span>
              ) : (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {r.result.status}
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}
