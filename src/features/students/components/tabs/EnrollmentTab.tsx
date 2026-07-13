import { useMemo, useState } from "react";

import type { TabProps } from "./TabProps";
import { useAuth } from "../../../auth/hooks/useAuth";
import { useSubscriptionAccess } from "../../../schools/hooks/useSubscriptionAccess";
import { useStreams } from "../../../academic/hooks/streamQueries";
import { StreamCapacityService } from "../../../../domain/academic/StreamCapacityService";
import {
  usePlaceStudent,
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
        <ChangeStreamControl
          schoolCode={schoolCode}
          studentNumber={studentNumber}
          academicLevelCode={current.academicLevelCode}
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

/**
 * Reassign the current class when a learner was placed in the wrong stream.
 * Writes the new stream CODE onto the active enrollment via the same
 * placement path admissions use; onEnrollmentWritten then recounts both the
 * old and new stream's occupancy server-side. Admin/head only, and never in
 * read-only mode.
 */
function ChangeStreamControl({
  schoolCode,
  studentNumber,
  academicLevelCode,
  currentStreamCode,
}: {
  schoolCode: string;
  studentNumber: string;
  academicLevelCode: string;
  currentStreamCode: string;
}) {
  const { profile } = useAuth();
  const { readOnly } = useSubscriptionAccess();
  const canChange = PLACER_ROLES.includes(profile?.role ?? "") && !readOnly;

  const streams = useStreams(schoolCode);
  const place = usePlaceStudent(schoolCode, studentNumber);

  const [editing, setEditing] = useState(false);
  const [streamCode, setStreamCode] = useState(currentStreamCode);
  const [error, setError] = useState<string | null>(null);

  const levelStreams = (streams.data ?? []).filter(
    (s) => s.academicLevelCode === academicLevelCode && s.active
  );

  const currentName =
    levelStreams.find((s) => s.streamCode === currentStreamCode)?.name ??
    currentStreamCode;

  async function save() {
    setError(null);
    if (streamCode === currentStreamCode) {
      setEditing(false);
      return;
    }
    try {
      await place.mutateAsync(streamCode);
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
            {academicLevelCode} · {currentName}
          </span>
        </p>
        {canChange && !editing && (
          <button
            onClick={() => {
              setStreamCode(currentStreamCode);
              setError(null);
              setEditing(true);
            }}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-100"
          >
            Change stream
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-3">
          {levelStreams.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={streamCode}
                onChange={(e) => setStreamCode(e.target.value)}
                className="rounded border border-sand p-2 text-sm"
              >
                {levelStreams.map((s) => {
                  const remaining = StreamCapacityService.remaining(s);
                  const full = StreamCapacityService.isFull(s);
                  // A full stream stays selectable if it's the current one.
                  const disabled = full && s.streamCode !== currentStreamCode;
                  return (
                    <option key={s.streamId} value={s.streamCode} disabled={disabled}>
                      {s.name} ({s.occupiedCount}/{s.capacity}
                      {full ? " — full" : ` — ${remaining} left`}
                      {s.streamCode === currentStreamCode ? " — current" : ""})
                    </option>
                  );
                })}
              </select>
              <button
                onClick={save}
                disabled={place.isPending}
                className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {place.isPending ? "Saving..." : "Save"}
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
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              No active streams exist for {academicLevelCode} yet.
            </p>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
