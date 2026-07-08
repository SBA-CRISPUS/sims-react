import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/hooks/useAuth";
import { useAcademicContext } from "../academic/hooks/useAcademicContext";
import { useLevels } from "../academic/hooks/streamQueries";
import { SbaDemoSeeder } from "../../domain/dev/SbaDemoSeeder";

export default function SbaSeedPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const isAdmin = profile?.role === "school_admin";

  const { academicYear, academicYearId, term, termId } = useAcademicContext();
  const levels = useLevels(schoolCode);
  const queryClient = useQueryClient();

  const [levelCode, setLevelCode] = useState("F2");
  const [streamCode, setStreamCode] = useState("A");
  const [learnerCount, setLearnerCount] = useState(8);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const levelExists = (levels.data ?? []).some((l) => l.levelCode === levelCode);
  const ready =
    isAdmin && !!schoolCode && !!academicYearId && !!termId && levelExists;

  async function run() {
    if (!ready || !profile) return;
    setRunning(true);
    setLog([]);
    try {
      await SbaDemoSeeder.seed({
        schoolCode: schoolCode!,
        actorUid: profile.uid,
        academicYearId: academicYearId!,
        termId: termId!,
        levelCode,
        streamCode,
        learnerCount,
        onLog: (m) => setLog((prev) => [...prev, m]),
      });
    } catch (e) {
      setLog((prev) => [
        ...prev,
        `ERROR: ${e instanceof Error ? e.message : "seed failed"}`,
      ]);
    } finally {
      // Refresh every cached read so the new data shows up everywhere.
      queryClient.invalidateQueries();
      setRunning(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">SBA Demo Data</h1>
      <p className="mt-1 text-gray-600">
        Seed a realistic SBA test class so you can walk the smoke-test
        checklist.
      </p>

      <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Dev/test tool.</strong> This writes real demo data (a subject,
        a stream, students, a teacher, a teaching assignment, exam numbers) to{" "}
        <strong>{school?.name}</strong>'s live database. Use it on a test
        school only. It runs as you ({profile?.role}) through the normal
        services — no rule bypass.
      </div>

      {!isAdmin && (
        <p className="mt-6 text-red-600">Only a school administrator can seed.</p>
      )}

      {isAdmin && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Academic year">
              <div className="rounded border bg-slate-50 p-2 text-sm">
                {academicYear?.name ?? "— pick in header —"}
              </div>
            </Field>
            <Field label="Term">
              <div className="rounded border bg-slate-50 p-2 text-sm">
                {term?.name ?? "— pick in header —"}
              </div>
            </Field>
            <Field label="Form">
              <select
                value={levelCode}
                onChange={(e) => setLevelCode(e.target.value)}
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
                className="w-full rounded border p-2"
              />
            </Field>
            <Field label="Students">
              <input
                type="number"
                min={1}
                max={50}
                value={learnerCount}
                onChange={(e) => setLearnerCount(Number(e.target.value))}
                className="w-full rounded border p-2"
              />
            </Field>
          </div>

          {!academicYearId && (
            <p className="mt-3 text-sm text-amber-700">
              Select an academic year and term in the header bar first.
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
            {running ? "Seeding..." : `Seed ${levelCode} ${streamCode}`}
          </button>

          {log.length > 0 && (
            <pre className="mt-6 max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
              {log.join("\n")}
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
