import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useSubjects } from "../../subjects/hooks/subjectQueries";
import { useStreams } from "../../academic/hooks/streamQueries";
import { useTeachers } from "../../teachers/hooks/teacherQueries";
import { teacherName } from "../../teachers/format";
import { useSbaSubmissions, useSubmissionAction } from "../hooks/sbaMarksQueries";
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
      acts.push({
        label: "Moderate",
        action: "moderate",
        className: "text-indigo-700",
      });
    if ((submitted || moderated) && canApprove)
      acts.push({
        label: "Approve",
        action: "approve",
        className: "text-green-700",
      });
    if ((submitted || moderated) && (canModerate || canApprove))
      acts.push({
        label: "Return",
        action: "return",
        className: "text-amber-700",
      });
    return acts;
  }

  function runAction(submissionId: string, a: SbaSubmissionActionType) {
    if (!profile) return;
    action.mutate({ actorUid: profile.uid, submissionId, action: a });
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
              <p className="p-6 text-gray-500">
                No submissions in this view.
              </p>
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
                    <tr key={s.submissionId} className="border-b">
                      <td className="p-3">{subjectName(s.subjectId)}</td>
                      <td className="p-3">{streamName(s.streamId)}</td>
                      <td className="p-3">{s.academicLevelCode}</td>
                      <td className="p-3">{teacherLabel(s.teacherId)}</td>
                      <td className="p-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            to={`/assessments/marks?form=${s.academicLevelCode}&stream=${s.streamId}&subject=${s.subjectId}`}
                            className="text-blue-700 hover:underline"
                          >
                            View
                          </Link>
                          {actionsFor(s).map((a) => (
                            <button
                              key={a.action}
                              onClick={() => runAction(s.submissionId, a.action)}
                              disabled={action.isPending}
                              className={`${a.className} hover:underline disabled:opacity-40`}
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
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
