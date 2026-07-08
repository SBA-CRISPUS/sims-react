import { useMemo, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useRegistry } from "../../students/hooks/studentQueries";
import {
  useYearPayments,
  useFeeStatusMap,
  useRecordPayment,
  useSetCleared,
} from "../hooks/financeQueries";
import { PAYMENT_METHODS } from "../../../domain/finance/Payment";
import type { PaymentMethod } from "../../../domain/finance/Payment";
import { downloadCsv } from "../../../lib/csv";

function money(n: number): string {
  return `K ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * The fee register for private / grant-aided schools: an append-only
 * payments ledger, per-learner totals, and the "cleared for reports"
 * switch that releases a learner's report card. Government schools are
 * fee-free by law - the page says so and stays inert.
 */
export default function PaymentsPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const { academicYearId, academicYear, terms } = useAcademicContext();

  const registry = useRegistry(schoolCode);
  const payments = useYearPayments(schoolCode, academicYearId);
  const feeStatus = useFeeStatusMap(schoolCode, academicYearId);
  const record = useRecordPayment(schoolCode ?? "");
  const setCleared = useSetCleared(schoolCode ?? "");

  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [termId, setTermId] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [focusStudent, setFocusStudent] = useState<string | null>(null);

  const students = useMemo(
    () =>
      (registry.data ?? [])
        .filter((r) => r.student.status === "active")
        .map((r) => r.student)
        .sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`
          )
        ),
    [registry.data]
  );
  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of registry.data ?? []) {
      map.set(
        r.student.studentNumber,
        `${r.student.firstName} ${r.student.lastName}`
      );
    }
    return (id: string) => map.get(id) ?? id;
  }, [registry.data]);

  const totals = useMemo(() => {
    const byStudent = new Map<
      string,
      { net: number; count: number; last?: Date }
    >();
    let collected = 0;
    for (const p of payments.data ?? []) {
      collected += p.amount;
      const entry = byStudent.get(p.studentId) ?? { net: 0, count: 0 };
      entry.net += p.amount;
      entry.count += 1;
      if (!entry.last || (p.recordedAt && p.recordedAt > entry.last)) {
        entry.last = p.recordedAt;
      }
      byStudent.set(p.studentId, entry);
    }
    return { byStudent, collected };
  }, [payments.data]);

  if (school && school.ownership === "Government") {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Payments</h1>
        <div className="mt-6 max-w-xl rounded-lg border border-green-200 bg-green-50 p-6">
          <p className="font-medium text-green-900">
            Free education — no fees to track.
          </p>
          <p className="mt-2 text-sm text-green-800">
            {school.name} is a Government school; education is free by law,
            so the fee register and report-card clearance are switched off.
            Report cards are always released. If the school's ownership is
            wrong, correct it on the School Profile page.
          </p>
        </div>
      </div>
    );
  }

  const clearedCount = [...(feeStatus.data?.values() ?? [])].filter(
    (s) => s.cleared
  ).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!academicYearId || !profile) return;
    setError(null);
    const value = Number(amount);
    if (!studentId) {
      setError("Pick a student.");
      return;
    }
    if (!value || Number.isNaN(value)) {
      setError("Enter an amount (negative for an adjustment/refund).");
      return;
    }
    try {
      await record.mutateAsync({
        studentId,
        academicYearId,
        termId: termId || null,
        amount: value,
        method,
        reference,
        note,
        actorUid: profile.uid,
      });
      setAmount("");
      setReference("");
      setNote("");
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not record the payment."
      );
    }
  }

  function exportLedger() {
    const rows = [
      ["Date", "Student", "Student No.", "Amount", "Method", "Term", "Reference", "Note"],
      ...(payments.data ?? []).map((p) => [
        p.recordedAt ? p.recordedAt.toLocaleDateString() : "",
        nameOf(p.studentId),
        p.studentId,
        String(p.amount),
        p.method,
        p.termId ?? "",
        p.reference ?? "",
        p.note ?? "",
      ]),
    ];
    downloadCsv(`Payments_${academicYearId}.csv`, rows);
  }

  const ledger = (payments.data ?? []).filter(
    (p) => !focusStudent || p.studentId === focusStudent
  );

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="mt-1 text-gray-600">
            {school?.name} · fee register
            {academicYear ? ` · ${academicYear.name}` : ""}
          </p>
        </div>
        <button
          onClick={exportLedger}
          disabled={(payments.data ?? []).length === 0}
          className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-40"
        >
          Export ledger CSV
        </button>
      </div>

      {!academicYearId ? (
        <p className="mt-6 text-gray-600">
          Select an academic year in the header bar to open the register.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-3">
            <Stat label="Collected this year" value={money(totals.collected)} />
            <Stat
              label="Students with payments"
              value={String(totals.byStudent.size)}
            />
            <Stat label="Cleared for reports" value={String(clearedCount)} />
          </div>

          <form
            onSubmit={submit}
            className="mt-6 rounded-lg border bg-slate-50 p-4"
          >
            <p className="font-medium">Record a payment</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-600">Student</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="mt-1 w-full rounded border p-2"
                >
                  <option value="">Select a student...</option>
                  {students.map((s) => (
                    <option key={s.studentNumber} value={s.studentNumber}>
                      {s.firstName} {s.lastName} ({s.studentNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600">
                  Amount (K)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="mt-1 w-full rounded border p-2"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Term</label>
                <select
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                  className="mt-1 w-full rounded border p-2"
                >
                  <option value="">—</option>
                  {terms.map((t) => (
                    <option key={t.termId} value={t.termId}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600">
                  Reference / receipt
                </label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm text-gray-600">Note</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Term 2 fees, part payment"
                  className="mt-1 w-full rounded border p-2"
                />
              </div>
              <button
                type="submit"
                disabled={record.isPending}
                className="rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {record.isPending ? "Recording..." : "Record payment"}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <p className="mt-2 text-xs text-gray-500">
              Entries can't be edited or deleted — correct mistakes with a
              negative adjustment entry. Clearing a student below releases
              their report card.
            </p>
          </form>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Per-learner totals + clearance. Every ACTIVE learner is
                listed (not just payers), so bursary/exempt learners can be
                cleared for reports without a ledger entry. */}
            <div className="rounded-lg bg-white shadow">
              <p className="border-b p-3 font-medium">By student</p>
              {students.length === 0 ? (
                <p className="p-6 text-sm text-gray-500">No active students.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-slate-50 text-gray-500">
                    <tr>
                      <th className="p-3">Student</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3 text-center">Entries</th>
                      <th className="p-3">Last</th>
                      <th className="p-3 text-center">Cleared for reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students
                      .map(
                        (s) =>
                          [
                            s.studentNumber,
                            totals.byStudent.get(s.studentNumber) ?? {
                              net: 0,
                              count: 0,
                              last: undefined,
                            },
                          ] as const
                      )
                      .map(([sid, t]) => (
                        <tr
                          key={sid}
                          className={`cursor-pointer border-b ${
                            focusStudent === sid ? "bg-blue-50" : ""
                          }`}
                          onClick={() =>
                            setFocusStudent((cur) => (cur === sid ? null : sid))
                          }
                        >
                          <td className="p-3">
                            {nameOf(sid)}
                            <span className="ml-1 font-mono text-xs text-gray-400">
                              {sid}
                            </span>
                          </td>
                          <td className="p-3 text-right font-medium">
                            {money(t.net)}
                          </td>
                          <td className="p-3 text-center">{t.count}</td>
                          <td className="p-3 text-xs">
                            {t.last ? t.last.toLocaleDateString() : "—"}
                          </td>
                          <td
                            className="p-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={
                                feeStatus.data?.get(sid)?.cleared ?? false
                              }
                              disabled={setCleared.isPending || !profile}
                              onChange={(e) =>
                                academicYearId &&
                                profile &&
                                setCleared.mutate({
                                  academicYearId,
                                  studentId: sid,
                                  cleared: e.target.checked,
                                  actorUid: profile.uid,
                                })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
              <p className="p-3 text-xs text-gray-500">
                Unchecked students' report cards are withheld (teachers can't
                open them; admins see a withhold notice). Click a row to
                filter the ledger.
              </p>
            </div>

            {/* Ledger */}
            <div className="rounded-lg bg-white shadow">
              <p className="border-b p-3 font-medium">
                Ledger{focusStudent ? ` — ${nameOf(focusStudent)}` : ""}
              </p>
              {payments.isLoading ? (
                <p className="p-6 text-sm text-gray-500">Loading...</p>
              ) : ledger.length === 0 ? (
                <p className="p-6 text-sm text-gray-500">No entries.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-slate-50 text-gray-500">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Student</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.slice(0, 50).map((p) => (
                      <tr key={p.paymentId} className="border-b">
                        <td className="p-3 text-xs">
                          {p.recordedAt
                            ? p.recordedAt.toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="p-3">{nameOf(p.studentId)}</td>
                        <td
                          className={`p-3 text-right font-medium ${
                            p.amount < 0 ? "text-red-700" : ""
                          }`}
                        >
                          {money(p.amount)}
                        </td>
                        <td className="p-3 text-xs">{p.method}</td>
                        <td className="p-3 font-mono text-xs">
                          {p.reference ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {ledger.length > 50 && (
                <p className="p-3 text-xs text-gray-500">
                  Showing the 50 most recent — export the CSV for the full
                  ledger.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-5 py-3 shadow">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
