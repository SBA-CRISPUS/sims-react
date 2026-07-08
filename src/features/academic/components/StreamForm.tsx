import { useState } from "react";

import { StreamValidator } from "../../../domain/academic/StreamValidator";
import type { Stream } from "../../../domain/academic/Stream";

export interface StreamFormValues {
  streamCode: string;
  name: string;
  capacity: number;
  active: boolean;
}

interface Props {
  levelName: string;
  existing?: Stream;
  existingCodes: string[];
  onCancel: () => void;
  onSubmit: (values: StreamFormValues) => Promise<void>;
}

export default function StreamForm({
  levelName,
  existing,
  existingCodes,
  onCancel,
  onSubmit,
}: Props) {
  const isEdit = !!existing;
  const [streamCode, setStreamCode] = useState(existing?.streamCode ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [capacity, setCapacity] = useState(existing?.capacity ?? 45);
  const [active, setActive] = useState(existing?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);

    const trimmedName = name.trim() || streamCode.trim().toUpperCase();
    const codeChanged =
      isEdit && streamCode.trim().toUpperCase() !== existing.streamCode;

    // On edit, the code is validated against the OTHER streams of the
    // level only when it actually changed (a rename).
    const validationError = isEdit
      ? (codeChanged
          ? StreamValidator.validate(
              { streamCode, capacity },
              existingCodes.filter((c) => c !== existing.streamCode)
            )
          : null) ?? StreamValidator.validateCapacity(capacity, existing.occupiedCount)
      : StreamValidator.validate({ streamCode, capacity }, existingCodes);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ streamCode, name: trimmedName, capacity, active });
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
      <p className="font-medium">
        {isEdit ? `Edit ${existing.name}` : "Add Stream"} — {levelName}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm text-gray-600">Code</label>
          <input
            value={streamCode}
            onChange={(e) => setStreamCode(e.target.value)}
            placeholder="A"
            className="w-full border rounded p-2"
          />
          {isEdit && (
            <p className="mt-1 text-xs text-gray-500">
              Changing the code renames the stream — its students move with
              it. Not possible once teaching assignments or SBA sheets exist.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm text-gray-600">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="A"
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Capacity</label>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full border rounded p-2"
          />
        </div>
      </div>

      {isEdit && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Active
        </label>
      )}

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
