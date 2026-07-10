import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useLevels, useStreams } from "../../academic/hooks/streamQueries";
import { useTeachingAssignments } from "../../teaching/hooks/teachingQueries";
import { useSbaPlans } from "../hooks/sbaQueries";
import {
  useSbaRoster,
  useSbaSubmission,
  useSbaMarks,
  useSaveMarks,
  useSubmissionAction,
} from "../hooks/sbaMarksQueries";
import { SBA_LEVELS } from "../../../domain/assessments/SbaPlan";
import { subjectWeightPercent } from "../../../domain/assessments/SbaWeighting";
import { useSubjects } from "../../subjects/hooks/subjectQueries";
import { sbaSubmissionId } from "../../../domain/assessments/SbaSubmission";
import type { SbaSubmissionMeta } from "../../../domain/assessments/SbaSubmission";
import MarksGrid from "../components/MarksGrid";
import SbaEvidencePanel from "../components/SbaEvidencePanel";

const MANAGER_ROLES = ["school_admin", "head_teacher", "hod"];

export default function SbaMarksPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canManage = MANAGER_ROLES.includes(profile?.role ?? "");

  const { academicYear, academicYearId } = useAcademicContext();

  // Seed the class selectors from the URL so the SBA Review board can deep
  // link straight to a class.
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(searchParams.get("form") ?? "");
  const [streamId, setStreamId] = useState(searchParams.get("stream") ?? "");
  const [subjectId, setSubjectId] = useState(searchParams.get("subject") ?? "");

  const plans = useSbaPlans(schoolCode);
  const levels = useLevels(schoolCode);
  const streams = useStreams(schoolCode);
  const subjects = useSubjects(schoolCode);
  const assignments = useTeachingAssignments(schoolCode);

  // ECZ weighting of the selected subject (30 norm / 40 PE) - display only.
  const weightPercent = subjectWeightPercent(
    subjects.data?.find((s) => s.subjectCode === subjectId)
  );

  const sbaLevels = (levels.data ?? []).filter((l) =>
    (SBA_LEVELS as readonly string[]).includes(l.levelCode)
  );
  const formStreams = (streams.data ?? []).filter(
    (s) => s.academicLevelCode === form && s.active
  );

  // Subjects with a PUBLISHED plan for this year + form are the only ones
  // that can be scored.
  const publishedPlans = useMemo(
    () =>
      (plans.data ?? []).filter(
        (p) =>
          p.academicYearId === academicYearId &&
          p.academicLevelCode === form &&
          p.status === "published"
      ),
    [plans.data, academicYearId, form]
  );

  const plan = publishedPlans.find((p) => p.subjectId === subjectId);
  const classReady = !!academicYearId && !!form && !!streamId && !!plan;

  const submissionId =
    classReady && academicYearId
      ? sbaSubmissionId({ academicYearId, streamId, subjectId })
      : undefined;

  const submission = useSbaSubmission(schoolCode, submissionId);
  const roster = useSbaRoster(schoolCode, academicYearId, streamId);
  const marks = useSbaMarks(schoolCode, submissionId);
  const saveMarks = useSaveMarks(schoolCode ?? "");
  const action = useSubmissionAction(schoolCode ?? "");

  const teacherId =
    (assignments.data ?? []).find(
      (a) =>
        a.active &&
        a.academicYearId === academicYearId &&
        a.streamId === streamId &&
        a.subjectId === subjectId
    )?.teacherId ?? null;

  // Managers may score any class; a teacher may score only the class they
  // own (matches the assignment-scoped Firestore rules). Non-owners still
  // see the sheet, read-only.
  const canScore =
    canManage ||
    (!!profile?.employeeNumber && teacherId === profile.employeeNumber);

  const meta: SbaSubmissionMeta | null =
    classReady && plan && academicYearId
      ? {
          planId: plan.planId,
          academicYearId,
          academicLevelCode: form,
          streamId,
          subjectId,
          teacherId,
        }
      : null;

  const loading =
    classReady && (roster.isLoading || marks.isLoading || submission.isLoading);
  const saving = saveMarks.isPending || action.isPending;

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold">SBA Marks</h1>
        {academicYear ? (
          <p className="mt-1 text-gray-600">
            {academicYear.name} · enter raw task marks for a class
          </p>
        ) : (
          <p className="mt-1 text-gray-600">{school?.name}</p>
        )}
      </div>

      {!academicYearId && (
        <p className="mt-6 text-gray-600">
          Select an academic year in the header bar to enter SBA marks.
        </p>
      )}

      {academicYearId && (
        <div className="mt-6 flex flex-wrap gap-3">
          <select
            value={form}
            onChange={(e) => {
              setForm(e.target.value);
              setStreamId("");
              setSubjectId("");
            }}
            className="rounded border p-2"
          >
            <option value="">Select form...</option>
            {sbaLevels.map((l) => (
              <option key={l.levelCode} value={l.levelCode}>
                {l.name}
              </option>
            ))}
          </select>

          <select
            value={streamId}
            onChange={(e) => setStreamId(e.target.value)}
            disabled={!form}
            className="rounded border p-2 disabled:opacity-50"
          >
            <option value="">Select stream...</option>
            {formStreams.map((s) => (
              <option key={s.streamId} value={s.streamId}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={!form}
            className="rounded border p-2 disabled:opacity-50"
          >
            <option value="">Select subject...</option>
            {publishedPlans.map((p) => (
              <option key={p.subjectId} value={p.subjectId}>
                {p.subjectName}
              </option>
            ))}
          </select>
        </div>
      )}

      {academicYearId && form && publishedPlans.length === 0 && (
        <p className="mt-4 text-sm text-amber-700">
          No published SBA plans for this form yet. Create and publish one in
          SBA Plans first.
        </p>
      )}

      {classReady && loading && (
        <p className="mt-6 text-gray-500">Loading score sheet...</p>
      )}

      {classReady && !loading && meta && (
        <div className="mt-6">
          <MarksGrid
            key={submissionId}
            plan={plan!}
            roster={roster.data ?? []}
            marks={marks.data ?? []}
            submission={submission.data ?? null}
            canScore={canScore}
            canManage={canManage}
            saving={saving}
            weightPercent={weightPercent}
            onSave={async (rows) => {
              if (!profile) return;
              await saveMarks.mutateAsync({
                actorUid: profile.uid,
                meta,
                submissionExists: !!submission.data,
                rows,
              });
            }}
            onSubmit={async () => {
              if (!profile || !submissionId) return;
              await action.mutateAsync({
                actorUid: profile.uid,
                submissionId,
                action: "submit",
              });
            }}
            onWithdraw={async () => {
              if (!profile || !submissionId) return;
              await action.mutateAsync({
                actorUid: profile.uid,
                submissionId,
                action: "withdraw",
              });
            }}
          />

          {/* Evidence add-on: renders only when the school's
              features.sbaEvidence entitlement is enabled. Needs a saved
              sheet (the metadata lives under the submission doc). */}
          {schoolCode && submissionId && submission.data && (
            <SbaEvidencePanel
              schoolCode={schoolCode}
              submissionId={submissionId}
            />
          )}
        </div>
      )}
    </div>
  );
}
