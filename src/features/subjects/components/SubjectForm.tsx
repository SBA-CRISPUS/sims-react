import { useState } from "react";

import { SubjectValidator } from "../../../domain/subjects/SubjectValidator";
import type { Subject } from "../../../domain/subjects/Subject";
import type { Department } from "../../../domain/academic/Department";
import type { AcademicLevel } from "../../../domain/academic/AcademicLevel";

export interface SubjectFormValues {
  subjectCode: string;
  name: string;
  departmentId: string | null;
  formsOffered: string[];
  sbaEnabled: boolean;
  active: boolean;
}

interface Props {
  existing?: Subject;
  existingCodes: string[];
  departments: Department[];
  levels: AcademicLevel[];
  onCancel: () => void;
  onSubmit: (values: SubjectFormValues) => Promise<void>;
}

export default function SubjectForm({
  existing,
  existingCodes,
  departments,
  levels,
  onCancel,
  onSubmit,
}: Props) {
  const isEdit = !!existing;
  const [subjectCode, setSubjectCode] = useState(existing?.subjectCode ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [departmentId, setDepartmentId] = useState(
    existing?.departmentId ?? ""
  );
  const [formsOffered, setFormsOffered] = useState<string[]>(
    existing?.formsOffered ?? levels.map((l) => l.levelCode)
  );
  const [sbaEnabled, setSbaEnabled] = useState(existing?.sbaEnabled ?? true);
  const [active, setActive] = useState(existing?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleForm(code: string) {
    setFormsOffered((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function submit() {
    setError(null);
    if (!isEdit) {
      const validationError = SubjectValidator.validate(
        { subjectCode, name },
        existingCodes
      );
      if (validationError) {
        setError(validationError);
        return;
      }
    } else if (!name.trim()) {
      setError("Subject name is required.");
      return;
    }
    if (formsOffered.length === 0) {
      setError("Select at least one form the subject is offered in.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        subjectCode,
        name,
        departmentId: departmentId || null,
        formsOffered,
        sbaEnabled,
        active,
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
      <p className="font-medium">{isEdit ? `Edit ${existing.name}` : "Add Subject"}</p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm text-gray-600">Code</label>
          <input
            value={subjectCode}
            onChange={(e) => setSubjectCode(e.target.value)}
            disabled={isEdit}
            placeholder="MAT"
            className="w-full border rounded p-2 disabled:bg-slate-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm text-gray-600">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mathematics"
            className="w-full border rounded p-2"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-sm text-gray-600">Department</label>
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="w-full border rounded p-2 sm:w-1/2"
        >
          <option value="">Unassigned</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        <p className="text-sm text-gray-600">Forms Offered</p>
        <div className="mt-1 flex flex-wrap gap-3">
          {levels.map((l) => (
            <label key={l.levelCode} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={formsOffered.includes(l.levelCode)}
                onChange={() => toggleForm(l.levelCode)}
              />
              {l.name}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sbaEnabled}
            onChange={(e) => setSbaEnabled(e.target.checked)}
          />
          SBA enabled
        </label>
        {isEdit && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active
          </label>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
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
