import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useSubjects } from "../../subjects/hooks/subjectQueries";
import { useStreams } from "../../academic/hooks/streamQueries";
import { useTeachers } from "../../teachers/hooks/teacherQueries";
import { teacherName } from "../../teachers/format";
import {
  useSbaSubmissions,
  useSbaSubmissionEvents,
  useSubmissionAction,
} from "../hooks/sbaMarksQueries";
import type { SbaSubmissionActionType } from "../hooks/sbaMarksQueries";
import type {
  SbaClassSubmission,
  SbaSubmissionStatus,
} from "../../../domain/assessments/SbaSubmission";

const MODERATOR_ROLES = ["school_admin", "head_teacher", "hod"];
const APPROVER_ROLES = ["school_admin", "head_teacher", "deputy_head"];

type StatusFilter = "review" | "approved" | "progress" | "all";

const FILTERS: { key: StatusFilter; label: string; match: SbaSubmissionStatus[] }[] =
  [
    { key: "review", label: "Needs review", match: ["submitted", "moderated"] },
    { key: "approved", label: "Approved", match: ["approved", "locked"] },
    { key: "progress", label: "In progress", match: ["draft", "returned"] },
    { key: "all", label: "All", match: [] },
  ];

interface ActionSpec {
  label: string;
  action: SbaSubmissionActionType;
  className: string;
}

const COLSPAN = 6;

export default function SbaReviewPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canModerate = MODERATOR_ROLES.includes(profile?.role ?? "");
  const canApprove = APPROVER_ROLES.includes(profile?.role ?? "");

  const { academicYear, academicYearId } = useAcademicContext();

  const submissions = useSbaSubmissions(schoolCode);
  const subjects = useSubjects(schoolCode);
  const streams = useStreams(schoolCode);
  const teachers = useTeachers(schoolCode);
  const action = useSubmissionAction(schoolCode ?? "");

  const [filter, setFilter] = useState<StatusFilter>("review");
  const [pending, setPending] = useState<{
    submissionId: string;
    action: SbaSubmissionActionType;
    label: string;
  } | null>(null);
  const [comment, setComment] = useState("");
  const [historyId, setHistoryId] = useState<string | null>(null);

  const subjectName = (code: string) =>
    subjects.data?.find((s) => s.subjectCode === code)?.name ?? code;
  const streamName = (id: string) =>
    streams.data?.find((s) => s.streamId === id)?.name ?? id;
  const teacherLabel = (empNo?: string | null) => {
    if (!empNo) return "—";
    const t = teachers.data?.find((x) => x.employeeNumber === empNo);
    return t ? teacherName(t) : empNo;
  };

  const rows = useMemo(() => {
    if (!academicYearId) return [];
    const match = FILTERS.find((f) => f.key === filter)!.match;
    return (submissions.data ?? [])
      .filter((s) => s.academicYearId === academicYearId)
      .filter((s) => match.length === 0 || match.includes(s.status))
      .sort(
        (a, b) =>
          a.academicLevelCode.localeCompare(b.academicLevelCode) ||
          streamName(a.streamId).localeCompare(streamName(b.streamId)) ||
          subjectName(a.subjectId).localeCompare(subjectName(b.subjectId))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions.data, academicYearId, filter, subjects.data, streams.data]);

  function actionsFor(s: SbaClassSubmission): ActionSpec[] {
    const acts: ActionSpec[] = [];
    const submitted = s.status === "submitted";
    const moderated = s.status === "moderated";
    if (submitted && canModerate)
      acts.push({ label: "Moderate", action: "moderate", className: "text-indigo-700" });
    if ((submitted || moderated) && canApprove)
      acts.push({ label: "Approve", action: "approve", className: "text-green-700" });
    if ((submitted || moderated) && (canModerate || canApprove))
      acts.push({ label: "Return", action: "return", className: "text-amber-700" });
    return acts;
  }

  async function confirmAction() {
    if (!profile || !pending) return;
    await action.mutateAsync({
      actorUid: profile.uid,
      submissionId: pending.submissionId,
      action: pending.action,
      comment: comment.trim() || undefined,
    });
    setPending(null);
    setComment("");
  }

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold">SBA Review</h1>
        {academicYear ? (
          <p className="mt-1 text-gray-600">
            {academicYear.name} · moderate and approve submitted score sheets
          </p>
        ) : (
          <p className="mt-1 text-gray-600">{school?.name}</p>
        )}
      </div>

      {!academicYearId && (
        <p className="mt-6 text-gray-600">
          Select an academic year in the header bar to review SBA submissions.
        </p>
      )}

      {academicYearId && (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-sm ${
                  filter === f.key
                    ? "bg-blue-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-white shadow">
            {submissions.isLoading && (
              <p className="p-6 text-gray-500">Loading submissions...</p>
            )}
            {!submissions.isLoading && rows.length === 0 && (
              <p className="p-6 text-gray-500">No submissions in this view.</p>
            )}
            {rows.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-gray-500">
                  <tr>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Form</th>
                    <th className="p-3">Teacher</th>
                    <th className="p-3">Status</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <RowGroup
                      key={s.submissionId}
                      submission={s}
                      subjectName={subjectName(s.subjectId)}
                      streamLabel={streamName(s.streamId)}
                      teacher={teacherLabel(s.teacherId)}
                      actions={actionsFor(s)}
                      pending={
                        pending?.submissionId === s.submissionId ? pending : null
                      }
                      comment={comment}
                      onComment={setComment}
                      onPick={(a) => {
                        setPending({
                          submissionId: s.submissionId,
                          action: a.action,
                          label: a.label,
                        });
                        setComment("");
                        setHistoryId(null);
                      }}
                      onCancel={() => setPending(null)}
                      onConfirm={confirmAction}
                      confirming={action.isPending}
                      historyOpen={historyId === s.submissionId}
                      onToggleHistory={() =>
                        setHistoryId((id) =>
                          id === s.submissionId ? null : s.submissionId
                        )
                      }
                      schoolCode={schoolCode}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="mt-3 text-sm text-gray-500">
            Approving a sheet freezes every learner's raw SBA mark and signs it
            off — it can't be edited afterwards.
          </p>
        </>
      )}
    </div>
  );
}

interface RowProps {
  submission: SbaClassSubmission;
  subjectName: string;
  streamLabel: string;
  teacher: string;
  actions: ActionSpec[];
  pending: { action: SbaSubmissionActionType; label: string } | null;
  comment: string;
  onComment: (v: string) => void;
  onPick: (a: ActionSpec) => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirming: boolean;
  historyOpen: boolean;
  onToggleHistory: () => void;
  schoolCode?: string;
}

function RowGroup({
  submission: s,
  subjectName,
  streamLabel,
  teacher,
  actions,
  pending,
  comment,
  onComment,
  onPick,
  onCancel,
  onConfirm,
  confirming,
  historyOpen,
  onToggleHistory,
  schoolCode,
}: RowProps) {
  return (
    <>
      <tr className="border-b">
        <td className="p-3">{subjectName}</td>
        <td className="p-3">{streamLabel}</td>
        <td className="p-3">{s.academicLevelCode}</td>
        <td className="p-3">{teacher}</td>
        <td className="p-3">
          <StatusBadge status={s.status} />
          {s.version && s.version > 1 && (
            <span className="ml-2 text-xs text-gray-400">v{s.version}</span>
          )}
        </td>
        <td className="p-3 text-right">
          <div className="flex items-center justify-end gap-3">
            <Link
              to={`/assessments/marks?form=${s.academicLevelCode}&stream=${s.streamId}&subject=${s.subjectId}`}
              className="text-blue-700 hover:underline"
            >
              View
            </Link>
            <button onClick={onToggleHistory} className="text-slate-600 hover:underline">
              History
            </button>
            {actions.map((a) => (
              <button
                key={a.action}
                onClick={() => onPick(a)}
                disabled={confirming}
                className={`${a.className} hover:underline disabled:opacity-40`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </td>
      </tr>

      {pending && (
        <tr className="border-b bg-slate-50">
          <td colSpan={COLSPAN} className="p-3">
            <p className="text-sm font-medium">{pending.label} this sheet</p>
            <textarea
              value={comment}
              onChange={(e) => onComment(e.target.value)}
              placeholder={
                pending.action === "return"
                  ? "Reason for returning (recommended)"
                  : "Comment (optional)"
              }
              rows={2}
              className="mt-2 w-full rounded border p-2 text-sm"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={onConfirm}
                disabled={confirming}
                className="rounded bg-blue-700 px-4 py-1.5 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {confirming ? "Working..." : `Confirm ${pending.label}`}
              </button>
              <button
                onClick={onCancel}
                className="rounded border border-slate-300 px-4 py-1.5 text-sm hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </td>
        </tr>
      )}

      {historyOpen && (
        <tr className="border-b bg-slate-50">
          <td colSpan={COLSPAN} className="p-3">
            <HistoryTimeline schoolCode={schoolCode} submissionId={s.submissionId} />
          </td>
        </tr>
      )}
    </>
  );
}

function HistoryTimeline({
  schoolCode,
  submissionId,
}: {
  schoolCode?: string;
  submissionId: string;
}) {
  const events = useSbaSubmissionEvents(schoolCode, submissionId);

  if (events.isLoading) return <p className="text-sm text-gray-500">Loading history...</p>;
  if ((events.data ?? []).length === 0)
    return <p className="text-sm text-gray-500">No workflow history yet.</p>;

  return (
    <ol className="space-y-2">
      {(events.data ?? []).map((e) => (
        <li key={e.id} className="flex gap-3 text-sm">
          <span className="text-gray-400">
            {e.at ? e.at.toLocaleString() : ""}
          </span>
          <span className="font-medium capitalize">
            {e.action.replace("sba.submission.", "")}
          </span>
          {e.version != null && (
            <span className="text-xs text-gray-400">v{e.version}</span>
          )}
          {e.comment && <span className="text-gray-600">“{e.comment}”</span>}
        </li>
      ))}
    </ol>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    returned: "bg-amber-100 text-amber-800",
    submitted: "bg-blue-100 text-blue-800",
    moderated: "bg-indigo-100 text-indigo-800",
    approved: "bg-green-100 text-green-800",
    locked: "bg-green-100 text-green-800",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs ${styles[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
}
