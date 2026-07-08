import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/hooks/useAuth";
import { useAcademicContext } from "../academic/hooks/useAcademicContext";
import { useLevels } from "../academic/hooks/streamQueries";
import { BulkStudentSeeder, MAX_BULK } from "../../domain/dev/BulkStudentSeeder";

export default function BulkAdmitPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const isAdmin = profile?.role === "school_admin";

  const { academicYear, academicYearId } = useAcademicContext();
  const levels = useLevels(schoolCode);
  const queryClient = useQueryClient();

  const [levelCode, setLevelCode] = useState("F2");
  const [streamCode, setStreamCode] = useState("A");
  const [target, setTarget] = useState(MAX_BULK);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [tail, setTail] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const levelExists = (levels.data ?? []).some((l) => l.levelCode === levelCode);
  const ready = isAdmin && !!schoolCode && !!academicYearId && levelExists;

  async function run() {
    if (!ready || !profile) return;
    setRunning(true);
    setError(null);
    setDone(0);
    setTotal(0);
    setTail([]);
    try {
      const res = await BulkStudentSeeder.admitClass({
        schoolCode: schoolCode!,
        actorUid: profile.uid,
        academicYearId: academicYearId!,
        levelCode,
        streamCode,
        target,
        onProgress: (d, t, msg) => {
          setDone(d);
          setTotal(t);
          setTail((prev) => [...prev.slice(-14), msg]);
        },
      });
      setTail((prev) => [...prev.slice(-14), `Done. Admitted ${res.admitted} student(s).`]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk admission failed.");
    } finally {
      queryClient.invalidateQueries();
      setRunning(false);
    }
  }

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Bulk Admit Students</h1>
      <p className="mt-1 text-gray-600">
        Admit up to {MAX_BULK} students into a class with one click, using a
        curated name list.
      </p>

      <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Dev/test tool.</strong> Writes real students (each through the
        normal audited admission) to <strong>{school?.name}</strong>'s live
        database. Admissions run one at a time, so {MAX_BULK} takes a few
        minutes and needs a stable connection. Runs as you ({profile?.role}) —
        no rule bypass.
      </div>

      {!isAdmin && (
        <p className="mt-6 text-red-600">Only a school administrator can do this.</p>
      )}

      {isAdmin && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Academic year">
              <div className="rounded border bg-slate-50 p-2 text-sm">
                {academicYear?.name ?? "— pick in header —"}
              </div>
            </Field>
            <Field label="Form">
              <select
                value={levelCode}
                onChange={(e) => setLevelCode(e.target.value)}
                disabled={running}
                className="w-full rounded border p-2"
              >
                {(levels.data ?? []).map((l) => (
                  <option key={l.levelCode} value={l.levelCode}>
                    {l.name} ({l.levelCode})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stream code">
              <input
                value={streamCode}
                onChange={(e) => setStreamCode(e.target.value.toUpperCase())}
                disabled={running}
                className="w-full rounded border p-2"
              />
            </Field>
            <Field label="Admit up to">
              <input
                type="number"
                min={1}
                max={MAX_BULK}
                value={target}
                onChange={(e) =>
                  setTarget(Math.min(MAX_BULK, Math.max(1, Number(e.target.value))))
                }
                disabled={running}
                className="w-full rounded border p-2"
              />
            </Field>
          </div>

          {!academicYearId && (
            <p className="mt-3 text-sm text-amber-700">
              Select an academic year in the header bar first.
            </p>
          )}
          {academicYearId && !levelExists && (
            <p className="mt-3 text-sm text-amber-700">
              Form {levelCode} isn't provisioned for this school.
            </p>
          )}

          <button
            onClick={run}
            disabled={!ready || running}
            className="mt-4 rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800 disabled:opacity-40"
          >
            {running
              ? `Admitting… ${done}/${total}`
              : `Admit up to ${target} into ${levelCode} ${streamCode}`}
          </button>

          {(running || done > 0) && total > 0 && (
            <div className="mt-4">
              <div className="h-2 w-full max-w-xl overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {done} of {total} admitted ({pct}%)
              </p>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          {tail.length > 0 && (
            <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
              {tail.join("\n")}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-600">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
