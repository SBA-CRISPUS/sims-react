import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  useIncomingTransfers,
  useOutgoingTransfers,
  useDecideTransfer,
  useCancelTransfer,
} from "../hooks/transferQueries";
import type { TransferRequest } from "../../../domain/transfers/TransferRequest";
import { useSubscriptionAccess } from "../../schools/hooks/useSubscriptionAccess";

// Deputies act for the Head on governance: they DECIDE incoming
// transfers. Releasing a student (initiate/cancel) stays admin/head.
const DECIDER_ROLES = ["school_admin", "head_teacher", "deputy_head"];
const SENDER_ROLES = ["school_admin", "head_teacher"];

type Tab = "incoming" | "outgoing";

export default function TransfersPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  // Network rule: a school in read-only (lapsed subscription) can view
  // its transfer history but cannot decide or respond until it renews.
  const { readOnly } = useSubscriptionAccess();
  const canDecide =
    !readOnly && DECIDER_ROLES.includes(profile?.role ?? "");
  const canCancel =
    !readOnly && SENDER_ROLES.includes(profile?.role ?? "");

  const incoming = useIncomingTransfers(schoolCode);
  const outgoing = useOutgoingTransfers(schoolCode);
  const decide = useDecideTransfer(schoolCode ?? "");
  const cancel = useCancelTransfer(schoolCode ?? "");

  const [tab, setTab] = useState<Tab>("incoming");
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const rows = tab === "incoming" ? incoming.data ?? [] : outgoing.data ?? [];
  const loading = tab === "incoming" ? incoming.isLoading : outgoing.isLoading;

  async function act(
    r: TransferRequest,
    decision: "accepted" | "rejected" | "info_requested"
  ) {
    if (!profile) return;
    await decide.mutateAsync({
      requestId: r.requestId,
      actorUid: profile.uid,
      decision,
      note,
    });
    setNote("");
    setOpenId(null);
  }

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold">Transfers</h1>
        <p className="mt-1 text-gray-600">
          {school?.name} · incoming and outgoing student transfers
        </p>
      </div>

      <div className="mt-6 flex gap-2">
        {(["incoming", "outgoing"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setOpenId(null);
            }}
            className={`rounded-full px-4 py-1.5 text-sm capitalize ${
              tab === t
                ? "bg-blue-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t}
            {t === "incoming" && (incoming.data?.length ?? 0) > 0
              ? ` (${incoming.data!.length})`
              : ""}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {loading && <p className="text-gray-500">Loading transfers...</p>}
        {!loading && rows.length === 0 && (
          <p className="text-gray-600">
            No {tab} transfers.
          </p>
        )}
        {rows.map((r) => {
          const id = r.studentSnapshot.identity;
          const name = `${id.firstName} ${id.lastName}`;
          const open = openId === r.requestId;
          return (
            <div key={r.requestId} className="rounded-lg bg-white p-4 shadow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-gray-500">
                    {tab === "incoming"
                      ? `From ${r.fromSchoolName} (${r.fromSchoolCode})`
                      : `To ${r.toSchoolCode}`}{" "}
                    · {r.reason}
                    {r.learnerId ? ` · ${r.learnerId}` : ""}
                    {r.transferNumber ? ` · ${r.transferNumber}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={r.status} />
                  <button
                    onClick={() =>
                      setOpenId((cur) => (cur === r.requestId ? null : r.requestId))
                    }
                    className="text-sm text-blue-700 hover:underline"
                  >
                    {open ? "Hide" : "View record"}
                  </button>
                </div>
              </div>

              {open && <SnapshotPreview request={r} />}

              {tab === "incoming" &&
                ["requested", "info_requested"].includes(r.status) &&
                canDecide && (
                <div className="mt-3 border-t pt-3">
                  <textarea
                    value={openId === r.requestId ? note : ""}
                    onChange={(e) => {
                      setOpenId(r.requestId);
                      setNote(e.target.value);
                    }}
                    placeholder="Optional note (required-ish for reject / request info)"
                    rows={2}
                    className="w-full rounded border p-2 text-sm"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => act(r, "accepted")}
                      disabled={decide.isPending}
                      className="rounded bg-green-700 px-4 py-1.5 text-sm text-white hover:bg-green-800 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => act(r, "rejected")}
                      disabled={decide.isPending}
                      className="rounded border border-red-600 px-4 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => act(r, "info_requested")}
                      disabled={decide.isPending}
                      className="rounded border border-amber-600 px-4 py-1.5 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      Request info
                    </button>
                  </div>
                </div>
              )}

              {tab === "outgoing" &&
                ["requested", "info_requested"].includes(r.status) &&
                canCancel && (
                  <div className="mt-3 flex items-center gap-3 border-t pt-3">
                    <button
                      onClick={() =>
                        profile &&
                        cancel.mutate({
                          requestId: r.requestId,
                          actorUid: profile.uid,
                        })
                      }
                      disabled={cancel.isPending}
                      className="rounded border border-slate-400 px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Cancel request
                    </button>
                    <span className="text-xs text-gray-500">
                      Withdraws this transfer (e.g. plans changed or the
                      record needs updating) — you can send a fresh one after.
                    </span>
                  </div>
                )}

              {r.decisionNote && (
                <p className="mt-2 text-sm text-gray-600">
                  Note: “{r.decisionNote}”
                </p>
              )}
              {r.status === "accepted" && (
                <p className="mt-2 text-xs text-gray-500">
                  Accepted — importing the student... (refresh in a moment).
                </p>
              )}
              {r.status === "completed" && (
                <p className="mt-2 text-xs text-green-700">
                  {tab === "incoming" ? (
                    <>
                      Completed — the student has been imported into your
                      records.{" "}
                      {r.importedStudentNumber ? (
                        <>
                          <Link
                            to={`/students/${r.importedStudentNumber}`}
                            className="font-medium text-blue-700 hover:underline"
                          >
                            Open their profile to assign a class
                          </Link>
                          .
                        </>
                      ) : (
                        "Assign them a class from the Students registry."
                      )}
                    </>
                  ) : (
                    <>
                      Completed — the student now belongs to {r.toSchoolCode}.
                      Their record here is preserved as history.
                    </>
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SnapshotPreview({ request }: { request: TransferRequest }) {
  const s = request.studentSnapshot;
  return (
    <div className="mt-3 space-y-4 rounded border bg-slate-50 p-3 text-sm">
      <div>
        <p className="font-medium">Identity</p>
        <p className="text-gray-600">
          {s.identity.firstName} {s.identity.otherNames ?? ""} {s.identity.lastName}
          {" · "}
          {s.identity.gender}
          {s.identity.dateOfBirth ? ` · DOB ${s.identity.dateOfBirth}` : ""}
          {s.identity.learnerId ? ` · ${s.identity.learnerId}` : ""}
          {s.identity.examinationNumber
            ? ` · Exam ${s.identity.examinationNumber}`
            : ""}
        </p>
      </div>

      <div>
        <p className="font-medium">Enrollment history</p>
        {s.enrollments.length === 0 ? (
          <p className="text-gray-500">None recorded.</p>
        ) : (
          <ul className="text-gray-600">
            {s.enrollments.map((e, i) => (
              <li key={i}>
                {e.academicYearId} · {e.academicLevelCode} · {e.streamId} ·{" "}
                {e.status}
              </li>
            ))}
          </ul>
        )}
      </div>

      {(s.guardians?.length ?? 0) > 0 && (
        <div>
          <p className="font-medium">Guardians</p>
          <ul className="text-gray-600">
            {(s.guardians ?? []).map((g, i) => (
              <li key={i}>
                {g.firstName} {g.lastName} · {g.relationship} · {g.phone}
                {g.email ? ` · ${g.email}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.cbc && (
        <div>
          <p className="font-medium">Student flags</p>
          <p className="text-gray-600">
            {[
              s.cbc.pathway ? `Pathway: ${s.cbc.pathway}` : null,
              s.cbc.specialNeeds ? "Special needs" : null,
              s.cbc.boarding ? "Boarding" : null,
              s.cbc.transport ? "Transport" : null,
            ]
              .filter(Boolean)
              .join(" · ") || "None"}
          </p>
        </div>
      )}

      <div>
        <p className="font-medium">SBA results</p>
        {s.sba.length === 0 ? (
          <p className="text-gray-500">No SBA marks recorded.</p>
        ) : (
          <div className="overflow-x-auto print:overflow-visible"><table className="mt-1 w-full text-left">
            <thead className="text-gray-500">
              <tr>
                <th className="pr-4">Form</th>
                <th className="pr-4">Subject</th>
                <th className="pr-4">Raw</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {s.sba.map((row, i) => (
                <tr key={i}>
                  <td className="pr-4">{row.academicLevelCode}</td>
                  <td className="pr-4">{row.subjectId}</td>
                  <td className="pr-4">{row.rawScore ?? "—"}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    requested: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    completed: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    info_requested: "bg-amber-100 text-amber-800",
    cancelled: "bg-slate-200 text-slate-600",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs ${styles[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
