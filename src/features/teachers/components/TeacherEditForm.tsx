import { useState } from "react";

import type { Teacher } from "../../../domain/teachers/Teacher";
import type { TeacherPatch } from "../../../domain/teachers/TeacherService";
import type { Department } from "../../../domain/academic/Department";

interface Props {
  teacher: Teacher;
  departments: Department[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (patch: TeacherPatch) => Promise<void>;
}

export default function TeacherEditForm({
  teacher,
  departments,
  saving,
  onCancel,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(teacher.title ?? "");
  const [firstName, setFirstName] = useState(teacher.firstName);
  const [lastName, setLastName] = useState(teacher.lastName);
  const [gender, setGender] = useState<Teacher["gender"]>(teacher.gender);
  const [phone, setPhone] = useState(teacher.phone);
  const [email, setEmail] = useState(teacher.email);
  const [departmentId, setDepartmentId] = useState(teacher.departmentId ?? "");
  const [employmentType, setEmploymentType] = useState(teacher.employmentType);
  const [qualification, setQualification] = useState(teacher.qualification ?? "");
  const [tscNumber, setTscNumber] = useState(teacher.tscNumber ?? "");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    try {
      await onSubmit({
        title: title.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        phone: phone.trim(),
        email: email.trim(),
        departmentId: departmentId || null,
        employmentType,
        qualification: qualification.trim(),
        tscNumber: tscNumber.trim(),
      });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Save failed.");
    }
  }

  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <p className="font-medium">Edit details</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border p-2" />
        </Field>
        <Field label="First name">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded border p-2" />
        </Field>
        <Field label="Last name">
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded border p-2" />
        </Field>
        <Field label="Gender">
          <select value={gender} onChange={(e) => setGender(e.target.value as Teacher["gender"])} className="w-full rounded border p-2">
            <option>Male</option>
            <option>Female</option>
          </select>
        </Field>
        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded border p-2" />
        </Field>
        <Field label="Email">
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border p-2" />
        </Field>
        <Field label="Department">
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full rounded border p-2">
            <option value="">— None —</option>
            {departments
              .filter((d) => d.active !== false || d.id === departmentId)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Employment type">
          <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="w-full rounded border p-2">
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Contract</option>
            <option>Volunteer</option>
          </select>
        </Field>
        <Field label="Qualification">
          <input value={qualification} onChange={(e) => setQualification(e.target.value)} className="w-full rounded border p-2" />
        </Field>
        <Field label="TSC number">
          <input value={tscNumber} onChange={(e) => setTscNumber(e.target.value)} className="w-full rounded border p-2" />
        </Field>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-100">
          Cancel
        </button>
      </div>
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
