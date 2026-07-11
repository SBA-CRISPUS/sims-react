import { useState } from "react";

import { useUpdateStudentDetails } from "../hooks/studentQueries";
import type { Student } from "../../../domain/students/Student";

/**
 * Inline correction form for a student's personal details (admin/head).
 * Permanent identifiers (student number, Learner ID, admission id) and
 * workflow fields (status, exam number) are deliberately not here.
 */
export default function StudentEditForm({
  schoolCode,
  student,
  onDone,
}: {
  schoolCode: string;
  student: Student;
  onDone: () => void;
}) {
  const update = useUpdateStudentDetails(schoolCode, student.studentNumber);
  const [firstName, setFirstName] = useState(student.firstName);
  const [otherNames, setOtherNames] = useState(student.otherNames ?? "");
  const [lastName, setLastName] = useState(student.lastName);
  const [gender, setGender] = useState<Student["gender"]>(student.gender);
  const [dateOfBirth, setDateOfBirth] = useState(
    student.dateOfBirth instanceof Date && !Number.isNaN(student.dateOfBirth.getTime())
      ? student.dateOfBirth.toISOString().slice(0, 10)
      : ""
  );
  const [nationality, setNationality] = useState(student.nationality);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      await update.mutateAsync({
        firstName,
        lastName,
        otherNames,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        nationality,
      });
      onDone();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the changes."
      );
    }
  }

  return (
    <div className="mt-4 rounded-lg border bg-slate-50 p-4">
      <p className="font-medium">Correct student details</p>
      <p className="mt-1 text-xs text-gray-500">
        Fixes typos and wrong dates. Student number, Learner ID and status
        never change here; the audit trail keeps the history.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="First name">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded border p-2"
          />
        </Field>
        <Field label="Other names">
          <input
            value={otherNames}
            onChange={(e) => setOtherNames(e.target.value)}
            className="w-full rounded border p-2"
          />
        </Field>
        <Field label="Last name">
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded border p-2"
          />
        </Field>
        <Field label="Gender">
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as Student["gender"])}
            className="w-full rounded border p-2"
          >
            <option>Male</option>
            <option>Female</option>
          </select>
        </Field>
        <Field label="Date of birth">
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="w-full rounded border p-2"
          />
        </Field>
        <Field label="Nationality">
          <input
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className="w-full rounded border p-2"
          />
        </Field>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-3">
        <button
          onClick={save}
          disabled={update.isPending}
          className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {update.isPending ? "Saving..." : "Save corrections"}
        </button>
        <button
          onClick={onDone}
          className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-600">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
