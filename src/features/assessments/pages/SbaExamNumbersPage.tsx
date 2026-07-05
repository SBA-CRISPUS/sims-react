import { useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useLevels, useStreams } from "../../academic/hooks/streamQueries";
import { useSbaRoster } from "../hooks/sbaMarksQueries";
import { useSetExamNumbers } from "../hooks/sbaExportQueries";
import type { Student } from "../../../domain/students/Student";

const MANAGER_ROLES = ["school_admin", "head_teacher"];

function studentName(s: Student): string {
  return [s.firstName, s.otherNames, s.lastName].filter(Boolean).join(" ");
}

export default function SbaExamNumbersPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canManage = MANAGER_ROLES.includes(profile?.role ?? "");

  const { academicYear, academicYearId } = useAcademicContext();
  const [form, setForm] = useState("");
  const [streamId, setStreamId] = useState("");

  const levels = useLevels(schoolCode);
  const streams = useStreams(schoolCode);
  const roster = useSbaRoster(schoolCode, academicYearId, streamId);
  const save = useSetExamNumbers(schoolCode ?? "");

  const [edited, setEdited] = useState<Record<string, string>>({});

  const formStreams = (streams.data ?? []).filter(
    (s) => s.academicLevelCode === form && s.active
  );

  function valueFor(s: Student) {
    return edited[s.studentNumber] ?? s.examinationNumber ?? "";
  }

  async function handleSave() {
    const rows = Object.entries(edited)
      .map(([studentNumber, examinationNumber]) => ({
        studentNumber,
        examinationNumber: examinationNumber.trim(),
      }))
      .filter((r) => r.examinationNumber);
    if (rows.length === 0) return;
    await save.mutateAsync(rows);
    setEdited({});
  }

  const dirtyCount = Object.keys(edited).length;

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold">Examination Numbers</h1>
        {academicYear ? (
          <p className="mt-1 text-gray-600">
            {academicYear.name} · assign ECZ examination numbers before export
          </p>
        ) : (
          <p className="mt-1 text-gray-600">{school?.name}</p>
        )}
      </div>

      {!academicYearId && (
        <p className="mt-6 text-gray-600">
          Select an academic year in the header bar first.
        </p>
      )}

      {academicYearId && (
        <div className="mt-6 flex flex-wrap gap-3">
          <select
            value={form}
            onChange={(e) => {
              setForm(e.target.value);
              setStreamId("");
              setEdited({});
            }}
            className="rounded border p-2"
          >
            <option value="">Select form...</option>
            {(levels.data ?? []).map((l) => (
              <option key={l.levelCode} value={l.levelCode}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            value={streamId}
            onChange={(e) => {
              setStreamId(e.target.value);
              setEdited({});
            }}
            disabled={!form}
            className="rounded border p-2 disabled:opacity-50"
          >
            <option value="">Select stream...</option>
            {formStreams.map((s) => (
              <option key={s.streamId} value={s.streamId}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {streamId && (
        <div className="mt-6 rounded-lg bg-white shadow">
          {roster.isLoading && (
            <p className="p-6 text-gray-500">Loading learners...</p>
          )}
          {!roster.isLoading && (roster.data ?? []).length === 0 && (
            <p className="p-6 text-gray-500">
              No learners enrolled in this stream this year.
            </p>
          )}
          {(roster.data ?? []).length > 0 && (
            <>
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-gray-500">
                  <tr>
                    <th className="p-3">Student No.</th>
                    <th className="p-3">Learner</th>
                    <th className="p-3">Examination number</th>
                  </tr>
                </thead>
                <tbody>
                  {(roster.data ?? []).map((s) => (
                    <tr key={s.studentNumber} className="border-b">
                      <td className="p-3 font-mono text-xs">{s.studentNumber}</td>
                      <td className="p-3">{studentName(s)}</td>
                      <td className="p-3">
                        <input
                          value={valueFor(s)}
                          disabled={!canManage}
                          onChange={(e) =>
                            setEdited((prev) => ({
                              ...prev,
                              [s.studentNumber]: e.target.value,
                            }))
                          }
                          placeholder="e.g. 1234/056"
                          className="w-48 rounded border p-1.5 disabled:bg-slate-100"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {canManage && (
                <div className="flex items-center gap-3 border-t p-4">
                  <button
                    onClick={handleSave}
                    disabled={save.isPending || dirtyCount === 0}
                    className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {save.isPending ? "Saving..." : "Save exam numbers"}
                  </button>
                  {dirtyCount > 0 && (
                    <span className="text-sm text-gray-500">
                      {dirtyCount} unsaved
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
