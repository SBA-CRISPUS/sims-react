import { useState } from "react";
import { Link } from "react-router-dom";

import { TransferSnapshotService } from "../../../domain/transfers/TransferSnapshotService";
import { useCreateTransfer, useManualTransferOut } from "../hooks/transferQueries";
import { useSubscriptionAccess } from "../../schools/hooks/useSubscriptionAccess";
import { DirectoryService } from "../../../domain/schools/DirectoryService";
import type { DirectoryEntry } from "../../../domain/schools/DirectoryService";

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
  const manualOut = useManualTransferOut(schoolCode);
  // Digital transfers are part of the SIMS network: a school whose
  // subscription has lapsed into read-only cannot initiate (or, on the
  // receiving side, decide) transfers until it renews.
  const { readOnly } = useSubscriptionAccess();
  // "sims" = digital envelope to another SIMS school; "manual" = the
  // receiving school is NOT on SIMS, so SIMS closes the record and the
  // paperwork (transfer letter, certificate, transcript) travels with
  // the student.
  const [mode, setMode] = useState<"sims" | "manual">("sims");
  const [destName, setDestName] = useState("");
  const [toSchoolCode, setToSchoolCode] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  // Directory lookup: the code must resolve to a real, active SIMS
  // school (and its name shown) before the envelope can be sent - no
  // more transfers addressed to a typo.
  const [lookup, setLookup] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "found"; entry: DirectoryEntry }
    | { state: "notfound"; code: string }
  >({ state: "idle" });

  async function lookUp() {
    const code = toSchoolCode.trim().toUpperCase();
    if (!code) return;
    setLookup({ state: "checking" });
    try {
      const entry = await DirectoryService.getEntry(code);
      setLookup(entry ? { state: "found", entry } : { state: "notfound", code });
    } catch {
      setLookup({ state: "notfound", code });
    }
  }

  if (readOnly) {
    return (
      <p className="rounded bg-amber-50 p-4 text-sm text-amber-800">
        Digital transfers need an active SIMS subscription. The school is
        currently in read-only mode — renew the subscription to initiate
        transfers again.
      </p>
    );
  }

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
    if (lookup.state !== "found" || lookup.entry.schoolCode !== code) {
      setError("Look up the code first and confirm it shows the school you mean.");
      return;
    }
    if (!lookup.entry.active) {
      setError(
        "That school is not active on SIMS right now — confirm with them before transferring."
      );
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

  async function submitManual() {
    setError(null);
    setBusy(true);
    try {
      await manualOut.mutateAsync({
        studentNumber,
        details: { schoolName: destName, reason, effectiveDate },
      });
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Could not record the transfer."
      );
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4">
        <p className="text-sm font-medium text-green-800">
          {mode === "sims"
            ? `Transfer request sent for ${studentName} to ${toSchoolCode.toUpperCase()}.`
            : `${studentName} recorded as transferred to ${destName}.`}
        </p>
        <p className="mt-1 text-sm text-green-700">
          {mode === "sims" ? (
            <>
              The receiving school will review the record and accept or
              reject it.
              {!learnerId &&
                " Note: this student has no SIMS Learner ID yet, which the receiving school needs to import them."}
            </>
          ) : (
            "Print the paperwork to travel with the student — the receiving school is not on SIMS, so the documents are the record."
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {/* The transfer letter and transcript travel with the student
              regardless of path - useful as a physical backup even
              while a digital request is still pending acceptance. The
              certificate is a statement that the transfer is COMPLETE,
              so it only makes sense once true: immediately for manual,
              only after the receiving school accepts for digital. */}
          <Link
            to={`/students/${studentNumber}/transfer-letter`}
            className="rounded bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-800"
          >
            Print transfer letter
          </Link>
          <Link
            to={`/students/${studentNumber}/transcript`}
            className="rounded border border-green-400 px-3 py-1.5 text-sm text-green-800 hover:bg-green-100"
          >
            Transcript
          </Link>
          {mode === "manual" && (
            <Link
              to={`/students/${studentNumber}/transfer-certificate`}
              className="rounded border border-green-400 px-3 py-1.5 text-sm text-green-800 hover:bg-green-100"
            >
              Transfer certificate
            </Link>
          )}
          <button
            onClick={onDone}
            className="rounded border border-green-400 px-3 py-1.5 text-sm text-green-800 hover:bg-green-100"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border bg-slate-50 p-4">
      <p className="font-medium">Transfer {studentName} to another school</p>
      <div className="mt-2 flex gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={mode === "sims"}
            onChange={() => setMode("sims")}
          />
          Receiving school is on SIMS (digital)
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={mode === "manual"}
            onChange={() => setMode("manual")}
          />
          Not on SIMS (manual, printed paperwork)
        </label>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {mode === "sims"
          ? "A snapshot of this student (identity, guardians, enrollment history, SBA results) is sent to the receiving school for review. The student isn't removed here until they accept."
          : "The record is closed here and the destination noted; you then print the transfer letter (with academic records), certificate and transcript to travel with the student."}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {mode === "manual" ? (
          <div>
            <label className="block text-sm text-gray-600">
              Receiving school name
            </label>
            <input
              value={destName}
              onChange={(e) => setDestName(e.target.value)}
              placeholder="e.g. Kabulonga Boys Secondary"
              className="mt-1 w-full rounded border p-2"
            />
          </div>
        ) : (
        <div>
          <label className="block text-sm text-gray-600">Receiving school code</label>
          <div className="mt-1 flex gap-2">
            <input
              value={toSchoolCode}
              onChange={(e) => {
                setToSchoolCode(e.target.value.toUpperCase());
                setLookup({ state: "idle" });
              }}
              onBlur={lookUp}
              placeholder="e.g. SCH-000003"
              className="w-full rounded border p-2"
            />
            <button
              type="button"
              onClick={lookUp}
              className="rounded border border-slate-300 px-3 text-sm hover:bg-slate-100"
            >
              Look up
            </button>
          </div>
          {lookup.state === "checking" && (
            <p className="mt-1 text-xs text-gray-500">Checking...</p>
          )}
          {lookup.state === "found" && (
            <p
              className={`mt-1 text-xs ${lookup.entry.active ? "text-green-700" : "text-amber-700"}`}
            >
              ✓ {lookup.entry.name}
              {lookup.entry.district ? ` — ${lookup.entry.district}` : ""}
              {!lookup.entry.active && " (not active on SIMS)"}
            </p>
          )}
          {lookup.state === "notfound" && (
            <p className="mt-1 text-xs text-red-600">
              No SIMS school with code {lookup.code} — check with the
              receiving school, or use the manual option above.
            </p>
          )}
        </div>
        )}
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
          onClick={mode === "sims" ? submit : submitManual}
          disabled={busy}
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {busy
            ? "Saving..."
            : mode === "sims"
              ? "Send transfer request"
              : "Record manual transfer"}
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
