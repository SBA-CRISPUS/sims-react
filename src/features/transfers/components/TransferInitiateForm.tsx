import { useState } from "react";

import { TransferSnapshotService } from "../../../domain/transfers/TransferSnapshotService";
import { useCreateTransfer } from "../hooks/transferQueries";

interface Props {
  schoolCode: string;
  schoolName: string;
  actorUid: string;
  studentNumber: string;
  learnerId?: string;
  studentName: string;
  onDone: () => void;
}

const today = new Date().toISOString().slice(0, 10);

export default function TransferInitiateForm({
  schoolCode,
  schoolName,
  actorUid,
  studentNumber,
  learnerId,
  studentName,
  onDone,
}: Props) {
  const create = useCreateTransfer(schoolCode);
  const [toSchoolCode, setToSchoolCode] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    const code = toSchoolCode.trim().toUpperCase();
    if (!code) {
      setError("Enter the receiving school's SIMS code.");
      return;
    }
    if (code === schoolCode) {
      setError("The receiving school must be different from this one.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setBusy(true);
    try {
      const snapshot = await TransferSnapshotService.buildForStudent(
        schoolCode,
        studentNumber
      );
      await create.mutateAsync({
        fromSchoolCode: schoolCode,
        fromSchoolName: schoolName,
        toSchoolCode: code,
        actorUid,
        studentNumber,
        learnerId: learnerId ?? null,
        snapshot,
        reason,
        effectiveDate,
      });
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error && e.message ? e.message : "Could not send the transfer."
      );
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4">
        <p className="text-sm font-medium text-green-800">
          Transfer request sent for {studentName} to {toSchoolCode.toUpperCase()}.
        </p>
        <p className="mt-1 text-sm text-green-700">
          The receiving school will review the record and accept or reject it.
          {!learnerId &&
            " Note: this learner has no SIMS Learner ID yet, which the receiving school needs to import them."}
        </p>
        <button
          onClick={onDone}
          className="mt-3 rounded border border-green-400 px-3 py-1.5 text-sm text-green-800 hover:bg-green-100"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border bg-slate-50 p-4">
      <p className="font-medium">Transfer {studentName} to another school</p>
      <p className="mt-1 text-xs text-gray-500">
        A snapshot of this learner (identity, guardians, enrollment history,
        SBA results) is sent to the receiving school for review. The learner
        isn't removed here until they accept.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm text-gray-600">Receiving school code</label>
          <input
            value={toSchoolCode}
            onChange={(e) => setToSchoolCode(e.target.value.toUpperCase())}
            placeholder="e.g. SCH-000003"
            className="mt-1 w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Reason</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Parent relocation"
            className="mt-1 w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Effective date</label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          onClick={submit}
          disabled={busy}
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send transfer request"}
        </button>
        <button
          onClick={onDone}
          className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
