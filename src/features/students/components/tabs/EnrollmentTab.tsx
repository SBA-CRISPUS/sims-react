import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { TabProps } from "./TabProps";
import { useAuth } from "../../../auth/hooks/useAuth";
import { useSubscriptionAccess } from "../../../schools/hooks/useSubscriptionAccess";
import { useLevels, useStreams } from "../../../academic/hooks/streamQueries";
import { StreamCapacityService } from "../../../../domain/academic/StreamCapacityService";
import {
  useChangePlacement,
  useStudentEnrollments,
} from "../../hooks/studentQueries";
import { formatDate } from "../../format";

// Mirrors the canManageStudents rule - other roles are denied the write.
const PLACER_ROLES = ["school_admin", "head_teacher"];

export default function EnrollmentTab({ schoolCode, studentNumber }: TabProps) {
  const { data, isLoading, isError } = useStudentEnrollments(
    schoolCode,
    studentNumber
  );

  const enrollments = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) =>
          (b.admissionDate?.getTime() ?? 0) - (a.admissionDate?.getTime() ?? 0)
      ),
    [data]
  );

  // The current placement = newest active enrollment (same rule the
  // registry uses). Only this one can have its stream reassigned.
  const current = useMemo(
    () => enrollments.find((e) => e.status === "active"),
    [enrollments]
  );

  if (isLoading) return <p className="text-gray-500">Loading enrollments...</p>;
  if (isError) return <p className="text-red-600">Failed to load enrollments.</p>;

  if (enrollments.length === 0) {
    return <p className="text-gray-500">No enrollment records.</p>;
  }

  return (
    <div className="space-y-4">
      {current && current.streamId && (
        <ChangePlacementControl
          schoolCode={schoolCode}
          studentNumber={studentNumber}
          currentLevelCode={current.academicLevelCode}
          currentStreamCode={current.streamId}
        />
      )}

      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-gray-500">
            <tr>
              <th className="p-3">Academic Year</th>
              <th className="p-3">Level</th>
              <th className="p-3">Stream</th>
              <th className="p-3">Admission Date</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e, i) => (
              <tr key={i} className="border-b">
                <td className="p-3">{e.academicYearId}</td>
                <td className="p-3">{e.academicLevelCode}</td>
                <td className="p-3">{e.streamId || "—"}</td>
                <td className="p-3">{formatDate(e.admissionDate)}</td>
                <td className="p-3 capitalize">{e.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Fallback if academic levels haven't loaded (they are provisioned per school).
const FALLBACK_LEVELS = [
  { levelCode: "F1", name: "Form 1" },
  { levelCode: "F2", name: "Form 2" },
  { levelCode: "F3", name: "Form 3" },
  { levelCode: "F4", name: "Form 4" },
];

/**
 * Reassign the current class when a learner was placed in the wrong form or
 * stream. Writes the new level + stream CODE onto the active enrollment via
 * the same placement path admissions use; onEnrollmentWritten then recounts
 * both the old and new stream's occupancy server-side (the recount key
 * embeds the level, so a form change reconciles too). Admin/head only, and
 * never in read-only mode.
 */
function ChangePlacementControl({
  schoolCode,
  studentNumber,
  currentLevelCode,
  currentStreamCode,
}: {
  schoolCode: string;
  studentNumber: string;
  currentLevelCode: string;
  currentStreamCode: string;
}) {
  const { profile } = useAuth();
  const { readOnly } = useSubscriptionAccess();
  const canChange = PLACER_ROLES.includes(profile?.role ?? "") && !readOnly;

  const levels = useLevels(schoolCode);
  const streams = useStreams(schoolCode);
  const change = useChangePlacement(schoolCode, studentNumber);

  const [editing, setEditing] = useState(false);
  const [levelCode, setLevelCode] = useState(currentLevelCode);
  const [streamCode, setStreamCode] = useState(currentStreamCode);
  const [error, setError] = useState<string | null>(null);

  const levelOptions =
    levels.data && levels.data.length > 0 ? levels.data : FALLBACK_LEVELS;

  const levelStreams = (streams.data ?? []).filter(
    (s) => s.academicLevelCode === levelCode && s.active
  );

  const currentName =
    (streams.data ?? []).find(
      (s) =>
        s.academicLevelCode === currentLevelCode &&
        s.streamCode === currentStreamCode
    )?.name ?? currentStreamCode;

  function beginEdit() {
    setLevelCode(currentLevelCode);
    setStreamCode(currentStreamCode);
    setError(null);
    setEditing(true);
  }

  function pickLevel(next: string) {
    setLevelCode(next);
    // Streams differ per level: keep the current stream only when staying on
    // the current level, otherwise force a fresh choice.
    setStreamCode(next === currentLevelCode ? currentStreamCode : "");
  }

  async function save() {
    setError(null);
    if (!streamCode) {
      setError("Pick a stream.");
      return;
    }
    if (levelCode === currentLevelCode && streamCode === currentStreamCode) {
      setEditing(false);
      return;
    }
    try {
      await change.mutateAsync({ levelCode, streamCode });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change the class.");
    }
  }

  return (
    <div className="rounded-lg border border-sand bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="text-gray-500">Current class:</span>{" "}
          <span className="font-medium">
            {currentLevelCode} · {currentName}
          </span>
        </p>
        {canChange && !editing && (
          <button
            onClick={beginEdit}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-100"
          >
            Change class
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-gray-500">Form</span>
            <select
              value={levelCode}
              onChange={(e) => pickLevel(e.target.value)}
              className="rounded border border-sand p-2 text-sm"
            >
              {levelOptions.map((l) => (
                <option key={l.levelCode} value={l.levelCode}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-xs text-gray-500">Stream</span>
            {levelStreams.length > 0 ? (
              <select
                value={streamCode}
                onChange={(e) => setStreamCode(e.target.value)}
                className="rounded border border-sand p-2 text-sm"
              >
                <option value="">Select a stream...</option>
                {levelStreams.map((s) => {
                  const remaining = StreamCapacityService.remaining(s);
                  const full = StreamCapacityService.isFull(s);
                  const isCurrent =
                    levelCode === currentLevelCode &&
                    s.streamCode === currentStreamCode;
                  // A full stream stays selectable only if it's the current one.
                  const disabled = full && !isCurrent;
                  return (
                    <option key={s.streamId} value={s.streamCode} disabled={disabled}>
                      {s.name} ({s.occupiedCount}/{s.capacity}
                      {full ? " — full" : ` — ${remaining} left`}
                      {isCurrent ? " — current" : ""})
                    </option>
                  );
                })}
              </select>
            ) : (
              <p className="rounded border border-sand bg-white p-2 text-sm text-gray-600">
                No active streams for {levelCode} —{" "}
                <Link to="/academic/structure" className="text-blue-700 underline">
                  create one
                </Link>
                .
              </p>
            )}
          </label>

          <button
            onClick={save}
            disabled={change.isPending || levelStreams.length === 0}
            className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {change.isPending ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
          >
            Cancel
          </button>

          {error && (
            <p className="w-full text-sm text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
