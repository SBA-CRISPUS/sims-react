import { useState } from "react";

import type { Teacher } from "../../../domain/teachers/Teacher";
import type { Subject } from "../../../domain/subjects/Subject";
import type { AcademicLevel } from "../../../domain/academic/AcademicLevel";
import type { Stream } from "../../../domain/academic/Stream";
import type { Department } from "../../../domain/academic/Department";
import type {
  TeachingAssignment,
  TeachingAssignmentInput,
} from "../../../domain/teaching/TeachingAssignment";
import { teacherName } from "../../teachers/format";

interface Props {
  academicYearId: string;
  termId: string;
  teachers: Teacher[];
  subjects: Subject[];
  levels: AcademicLevel[];
  streams: Stream[];
  departments: Department[];
  assignments: TeachingAssignment[];
  defaultTeacherId?: string;
  onCancel: () => void;
  onSubmit: (input: TeachingAssignmentInput) => Promise<void>;
}

export default function AssignmentForm({
  academicYearId,
  termId,
  teachers,
  subjects,
  levels,
  streams,
  departments,
  assignments,
  defaultTeacherId,
  onCancel,
  onSubmit,
}: Props) {
  const [teacherId, setTeacherId] = useState(defaultTeacherId ?? "");
  const [subjectId, setSubjectId] = useState("");
  const [academicLevelCode, setLevelCode] = useState("");
  const [streamId, setStreamId] = useState("");
  const [periodsPerWeek, setPeriods] = useState(5);
  const [classTeacher, setClassTeacher] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeTeachers = teachers.filter((t) => t.status === "active");
  const activeSubjects = subjects.filter((s) => s.active);

  // Show the selected teacher's department (loaded with the teacher).
  const selectedTeacher = teachers.find((t) => t.employeeNumber === teacherId);
  const teacherDept = selectedTeacher
    ? departments.find((d) => d.id === selectedTeacher.departmentId)?.name ??
      "No department"
    : null;
  const levelStreams = streams.filter(
    (s) => s.academicLevelCode === academicLevelCode && s.active
  );

  // Warn (don't block) if this slot is already staffed by someone else.
  const occupant =
    subjectId && streamId
      ? assignments.find(
          (a) =>
            a.active &&
            a.academicYearId === academicYearId &&
            a.termId === termId &&
            a.streamId === streamId &&
            a.subjectId === subjectId &&
            a.teacherId !== teacherId
        )
      : undefined;
  const occupantTeacher = occupant
    ? teachers.find((t) => t.employeeNumber === occupant.teacherId)
    : undefined;

  async function submit() {
    setError(null);
    if (!teacherId || !subjectId || !academicLevelCode || !streamId) {
      setError("Teacher, subject, form and stream are all required.");
      return;
    }
    if (!Number.isInteger(periodsPerWeek) || periodsPerWeek <= 0) {
      setError("Periods per week must be a positive whole number.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        teacherId,
        academicYearId,
        termId,
        subjectId,
        academicLevelCode,
        streamId,
        periodsPerWeek,
        classTeacher,
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Save failed. Please try again."
      );
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <p className="font-medium">Assign Teaching</p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-gray-600">Teacher</label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="">Select teacher...</option>
            {activeTeachers.map((t) => (
              <option key={t.employeeNumber} value={t.employeeNumber}>
                {teacherName(t)} ({t.employeeNumber})
              </option>
            ))}
          </select>
          {teacherDept && (
            <p className="mt-1 text-xs text-gray-500">
              Department: {teacherDept}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-600">Subject</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="">Select subject...</option>
            {activeSubjects.map((s) => (
              <option key={s.subjectCode} value={s.subjectCode}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600">Form</label>
          <select
            value={academicLevelCode}
            onChange={(e) => {
              setLevelCode(e.target.value);
              setStreamId("");
            }}
            className="w-full border rounded p-2"
          >
            <option value="">Select form...</option>
            {levels.map((l) => (
              <option key={l.levelCode} value={l.levelCode}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600">Stream</label>
          <select
            value={streamId}
            onChange={(e) => setStreamId(e.target.value)}
            disabled={!academicLevelCode}
            className="w-full border rounded p-2 disabled:opacity-50"
          >
            <option value="">Select stream...</option>
            {levelStreams.map((s) => (
              <option key={s.streamId} value={s.streamId}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600">Periods / week</label>
          <input
            type="number"
            min={1}
            value={periodsPerWeek}
            onChange={(e) => setPeriods(Number(e.target.value))}
            className="w-full border rounded p-2"
          />
        </div>

        <label className="flex items-center gap-2 self-end text-sm">
          <input
            type="checkbox"
            checked={classTeacher}
            onChange={(e) => setClassTeacher(e.target.checked)}
          />
          Class teacher for this stream
        </label>
      </div>

      {occupant && (
        <p className="mt-2 text-sm text-amber-700">
          This class already has this subject taught by{" "}
          {occupantTeacher ? teacherName(occupantTeacher) : occupant.teacherId}.
          Saving will reassign it.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Assignment"}
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
