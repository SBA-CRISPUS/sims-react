import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useStreams } from "../../academic/hooks/streamQueries";
import { StreamCapacityService } from "../../../domain/academic/StreamCapacityService";
import {
  usePlaceStudent,
  useStudentEnrollments,
} from "../hooks/studentQueries";

// Mirrors the canManageStudents rule - other roles would be denied the write.
const PLACER_ROLES = ["school_admin", "head_teacher"];

/**
 * Banner shown on a student profile while the current enrollment has no
 * stream - the state a cross-school transfer import leaves the learner in.
 * Lets an admin assign the class right there; disappears once placed.
 */
export default function PlacementPanel({
  schoolCode,
  studentNumber,
}: {
  schoolCode: string;
  studentNumber: string;
}) {
  const { profile } = useAuth();
  const canPlace = PLACER_ROLES.includes(profile?.role ?? "");

  const enrollments = useStudentEnrollments(schoolCode, studentNumber);
  const streams = useStreams(schoolCode);
  const place = usePlaceStudent(schoolCode, studentNumber);

  const [streamCode, setStreamCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const current = useMemo(
    () =>
      [...(enrollments.data ?? [])]
        .filter((e) => e.status === "active")
        .sort(
          (a, b) =>
            (b.admissionDate?.getTime() ?? 0) - (a.admissionDate?.getTime() ?? 0)
        )[0],
    [enrollments.data]
  );

  if (!canPlace || !current || current.streamId) return null;

  const levelStreams = (streams.data ?? []).filter(
    (s) => s.academicLevelCode === current.academicLevelCode && s.active
  );

  async function assign() {
    setError(null);
    try {
      await place.mutateAsync(streamCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign the class.");
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="font-medium text-amber-900">No class assigned</p>
      <p className="mt-1 text-sm text-amber-800">
        The {current.academicLevelCode} enrollment for {current.academicYearId}{" "}
        has no stream (transferred-in learners arrive unplaced), so this
        learner appears in no class roster yet.
      </p>

      {streams.isLoading ? (
        <p className="mt-3 text-sm text-amber-800">Loading streams...</p>
      ) : levelStreams.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={streamCode}
            onChange={(e) => setStreamCode(e.target.value)}
            className="rounded border p-2 text-sm"
          >
            <option value="">Select a stream...</option>
            {levelStreams.map((s) => {
              const remaining = StreamCapacityService.remaining(s);
              const full = StreamCapacityService.isFull(s);
              return (
                <option key={s.streamId} value={s.streamCode} disabled={full}>
                  {s.name} ({s.occupiedCount}/{s.capacity}
                  {full ? " — full" : ` — ${remaining} left`})
                </option>
              );
            })}
          </select>
          <button
            onClick={assign}
            disabled={!streamCode || place.isPending}
            className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {place.isPending ? "Assigning..." : "Assign class"}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-amber-800">
          No active streams exist for {current.academicLevelCode} yet —{" "}
          <Link to="/academic/structure" className="text-blue-700 underline">
            create one under Academic Structure
          </Link>{" "}
          first.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
