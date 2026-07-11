import { useMemo, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { useSubscriptionAccess } from "../../schools/hooks/useSubscriptionAccess";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useLevels, useStreams } from "../../academic/hooks/streamQueries";
import { useSubjects } from "../../subjects/hooks/subjectQueries";
import { useSbaRoster } from "../hooks/sbaMarksQueries";
import {
  useCaAssessments,
  useCreateCaAssessment,
  useSaveCaScores,
  useDeleteCaAssessment,
} from "../hooks/caQueries";
import { CA_TYPES } from "../../../domain/assessments/CaAssessment";
import type { CaAssessment, CaType } from "../../../domain/assessments/CaAssessment";
import type { Student } from "../../../domain/students/Student";
import { classStats } from "../../../domain/assessments/SbaStatsService";
import { downloadCsv } from "../../../lib/csv";

function studentName(s: Student): string {
  return [s.firstName, s.otherNames, s.lastName].filter(Boolean).join(" ");
}

/**
 * Continuous assessment: the school's own tests (class, monthly,
 * mid-term, end-of-term), per class + subject. Separate from ECZ SBA -
 * no workflow, no export to ECZ; record, review and share internally.
 */
export default function ContinuousAssessmentPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const { academicYear, academicYearId, term } = useAcademicContext();

  const [form, setForm] = useState("");
  const [streamId, setStreamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const levels = useLevels(schoolCode);
  const streams = useStreams(schoolCode);
  const subjects = useSubjects(schoolCode);
  const roster = useSbaRoster(schoolCode, academicYearId, streamId || undefined);
  const assessments = useCaAssessments(schoolCode, streamId || undefined);
  const create = useCreateCaAssessment(schoolCode ?? "", streamId);
  const save = useSaveCaScores(schoolCode ?? "", streamId);
  const remove = useDeleteCaAssessment(schoolCode ?? "", streamId);

  // Read-only mode (lapsed subscription): viewing and CSV export stay;
  // creating, scoring and deleting are blocked.
  const { readOnly } = useSubscriptionAccess();
  const canDelete =
    !readOnly &&
    ["school_admin", "head_teacher"].includes(profile?.role ?? "");

  const formStreams = (streams.data ?? []).filter(
    (s) => s.academicLevelCode === form && s.active
  );
  const formSubjects = (subjects.data ?? []).filter(
    (s) => s.active !== false && (s.formsOffered ?? []).includes(form)
  );
  const subjectName = (code: string) =>
    subjects.data?.find((s) => s.subjectCode === code)?.name ?? code;

  const classAssessments = useMemo(
    () =>
      (assessments.data ?? []).filter(
        (a) =>
          a.academicYearId === academicYearId && a.subjectId === subjectId
      ),
    [assessments.data, academicYearId, subjectId]
  );

  const ready = !!academicYearId && !!form && !!streamId && !!subjectId;

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold">Continuous Assessment</h1>
        <p className="mt-1 text-gray-600">
          {academicYear
            ? `${academicYear.name}${term ? ` · ${term.name}` : ""} · the school's own tests — separate from ECZ SBA`
            : school?.name}
        </p>
      </div>

      {!academicYearId && (
        <p className="mt-6 text-gray-600">
          Select an academic year in the header bar to record assessments.
        </p>
      )}

      {academicYearId && (
        <div className="mt-6 flex flex-wrap gap-3">
          <select
            value={form}
            onChange={(e) => {
              setForm(e.target.value);
              setStreamId("");
              setSubjectId("");
              setOpenId(null);
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
              setOpenId(null);
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

          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setOpenId(null);
            }}
            disabled={!form}
            className="rounded border p-2 disabled:opacity-50"
          >
            <option value="">Select subject...</option>
            {formSubjects.map((s) => (
              <option key={s.subjectCode} value={s.subjectCode}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {ready && (
        <>
          <div className="mt-6 flex items-center justify-between">
            <p className="font-medium">
              {subjectName(subjectId)} ·{" "}
              {formStreams.find((s) => s.streamId === streamId)?.name ?? streamId}
            </p>
            {!readOnly && (
              <button
                onClick={() => setCreating((c) => !c)}
                className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800"
              >
                {creating ? "Close" : "+ New assessment"}
              </button>
            )}
          </div>

          {creating && (
            <CreateForm
              busy={create.isPending}
              onCreate={async (name, type, maxMarks, date) => {
                if (!profile) return;
                await create.mutateAsync({
                  input: {
                    academicYearId: academicYearId!,
                    termId: term?.termId ?? null,
                    academicLevelCode: form,
                    streamId,
                    subjectId,
                    name,
                    type,
                    maxMarks,
                    date,
                  },
                  actorUid: profile.uid,
                });
                setCreating(false);
              }}
            />
          )}

          {assessments.isLoading ? (
            <p className="mt-4 text-gray-500">Loading assessments...</p>
          ) : classAssessments.length === 0 ? (
            <p className="mt-4 rounded-lg bg-white p-6 text-sm text-gray-500 shadow">
              No assessments recorded for this class and subject yet — create
              the first with “New assessment”.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {classAssessments.map((a) => (
                <AssessmentCard
                  key={a.assessmentId}
                  assessment={a}
                  open={openId === a.assessmentId}
                  onToggle={() =>
                    setOpenId((id) =>
                      id === a.assessmentId ? null : a.assessmentId
                    )
                  }
                  roster={roster.data ?? []}
                  saving={save.isPending}
                  onSave={(scores, absent) => {
                    if (readOnly)
                      return Promise.reject(
                        new Error(
                          "Read-only mode — renew the subscription to record scores."
                        )
                      );
                    return save.mutateAsync({
                      assessmentId: a.assessmentId,
                      scores,
                      absent,
                    });
                  }}
                  canDelete={canDelete}
                  onDelete={() => {
                    if (
                      window.confirm(
                        `Delete "${a.name}" and all its scores? This cannot be undone.`
                      )
                    )
                      remove.mutate(a.assessmentId);
                  }}
                  subjectName={subjectName(a.subjectId)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CreateForm({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (
    name: string,
    type: CaType,
    maxMarks: number,
    date: string
  ) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CaType>("Class Test");
  const [maxMarks, setMaxMarks] = useState(20);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4 rounded-lg bg-white p-5 shadow">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-sm text-gray-600">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Week 5 class test"
            className="mt-1 w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CaType)}
            className="mt-1 w-full rounded border p-2"
          >
            {CA_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Out of</label>
          <input
            type="number"
            min={1}
            value={maxMarks}
            onChange={(e) => setMaxMarks(Number(e.target.value))}
            className="mt-1 w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={async () => {
          setError(null);
          try {
            await onCreate(name, type, maxMarks, date);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Could not create the test."
            );
          }
        }}
        disabled={busy}
        className="mt-3 rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {busy ? "Creating..." : "Create assessment"}
      </button>
    </div>
  );
}

function AssessmentCard({
  assessment,
  open,
  onToggle,
  roster,
  saving,
  onSave,
  canDelete,
  onDelete,
  subjectName,
}: {
  assessment: CaAssessment;
  open: boolean;
  onToggle: () => void;
  roster: Student[];
  saving: boolean;
  onSave: (
    scores: Record<string, number>,
    absent: string[]
  ) => Promise<unknown>;
  canDelete: boolean;
  onDelete: () => void;
  subjectName: string;
}) {
  const scored = Object.values(assessment.scores ?? {});
  const stats = classStats(scored);
  const pct =
    stats && assessment.maxMarks > 0
      ? Math.round((stats.mean / assessment.maxMarks) * 100)
      : null;

  return (
    <div className="rounded-lg bg-white shadow">
      <button
        onClick={onToggle}
        className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left hover:bg-slate-50"
      >
        <div>
          <p className="font-medium">{assessment.name}</p>
          <p className="text-sm text-gray-500">
            {assessment.type} · {assessment.date} · out of {assessment.maxMarks}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">
            {scored.length}/{roster.length || "—"} scored
          </span>
          {stats && (
            <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-800">
              avg {stats.mean.toFixed(1)}
              {pct !== null ? ` (${pct}%)` : ""}
            </span>
          )}
          <span className="text-gray-400">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <ScoreGrid
          key={assessment.assessmentId}
          assessment={assessment}
          roster={roster}
          saving={saving}
          onSave={onSave}
          canDelete={canDelete}
          onDelete={onDelete}
          subjectName={subjectName}
        />
      )}
    </div>
  );
}

function ScoreGrid({
  assessment,
  roster,
  saving,
  onSave,
  canDelete,
  onDelete,
  subjectName,
}: {
  assessment: CaAssessment;
  roster: Student[];
  saving: boolean;
  onSave: (
    scores: Record<string, number>,
    absent: string[]
  ) => Promise<unknown>;
  canDelete: boolean;
  onDelete: () => void;
  subjectName: string;
}) {
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [id, v] of Object.entries(assessment.scores ?? {}))
      initial[id] = String(v);
    return initial;
  });
  const [absent, setAbsent] = useState<Set<string>>(
    () => new Set(assessment.absent ?? [])
  );
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(false);

  const max = assessment.maxMarks;

  function exportCsv() {
    downloadCsv(`CA_${assessment.name.replace(/\s+/g, "_")}.csv`, [
      ["Assessment:", assessment.name],
      ["Subject:", subjectName],
      ["Type:", assessment.type],
      ["Date:", assessment.date],
      [],
      ["Student No.", "Student", `Score /${max}`, "Absent"],
      ...roster.map((s) => [
        s.studentNumber,
        studentName(s),
        absent.has(s.studentNumber) ? "" : (scores[s.studentNumber] ?? ""),
        absent.has(s.studentNumber) ? "yes" : "",
      ]),
    ]);
  }

  async function saveAll() {
    setError(null);
    const clean: Record<string, number> = {};
    for (const [id, raw] of Object.entries(scores)) {
      if (absent.has(id) || raw.trim() === "") continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > max) {
        setError(`Scores must be between 0 and ${max}.`);
        return;
      }
      clean[id] = Math.round(n);
    }
    try {
      await onSave(clean, [...absent]);
      setSavedTick(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the scores."
      );
    }
  }

  return (
    <div className="border-t p-4">
      {roster.length === 0 ? (
        <p className="text-sm text-gray-500">
          No students enrolled in this stream for the selected year.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-gray-500">
              <tr>
                <th className="p-2">Student</th>
                <th className="p-2 text-center">Score /{max}</th>
                <th className="p-2 text-center">Absent</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((s) => {
                const id = s.studentNumber;
                const isAbsent = absent.has(id);
                return (
                  <tr key={id} className="border-b">
                    <td className="p-2">
                      {studentName(s)}
                      <span className="ml-2 font-mono text-xs text-gray-400">
                        {id}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min={0}
                        max={max}
                        value={isAbsent ? "" : (scores[id] ?? "")}
                        disabled={isAbsent}
                        onChange={(e) => {
                          setSavedTick(false);
                          setScores((prev) => ({
                            ...prev,
                            [id]: e.target.value,
                          }));
                        }}
                        className="w-20 rounded border p-1 text-center disabled:bg-slate-100"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={isAbsent}
                        onChange={(e) => {
                          setSavedTick(false);
                          setAbsent((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(id);
                            else next.delete(id);
                            return next;
                          });
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={saveAll}
          disabled={saving}
          className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save scores"}
        </button>
        {savedTick && !saving && (
          <span className="text-sm text-green-700">Saved ✓</span>
        )}
        <button
          onClick={exportCsv}
          className="rounded border border-blue-700 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
        >
          Export CSV
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            className="ml-auto text-sm text-red-600 hover:underline"
          >
            Delete assessment
          </button>
        )}
      </div>
    </div>
  );
}
