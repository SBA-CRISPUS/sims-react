import { useState } from "react";

import { useAuth } from "../auth/hooks/useAuth";
import { useAcademicContext } from "../academic/hooks/useAcademicContext";
import { useStreams } from "../academic/hooks/streamQueries";
import { useSubjects } from "../subjects/hooks/subjectQueries";
import { useSbaSubmissions } from "../assessments/hooks/sbaMarksQueries";
import {
  useIncomingTransfers,
  useOutgoingTransfers,
} from "../transfers/hooks/transferQueries";
import { useRegistry } from "../students/hooks/studentQueries";
import { useSchoolUsers } from "../staff/hooks/staffQueries";
import { useSchool } from "../schools/hooks/schoolQueries";
import { SBA_LEVELS } from "../../domain/assessments/SbaPlan";

export interface TaskItem {
  id: string;
  title: string;
  detail?: string;
  /** Aggregate rows carry a count chip; single items omit it. */
  count?: number;
  to: string;
  tone: "red" | "amber" | "blue" | "slate";
}

export interface TaskSection {
  title: string;
  items: TaskItem[];
}

const REVIEWER_ROLES = ["school_admin", "head_teacher", "deputy_head", "hod"];
const APPROVER_ROLES = ["school_admin", "head_teacher", "deputy_head"];
const TRANSFER_ROLES = ["school_admin", "head_teacher"];
const EXPORTER_ROLES = ["school_admin", "head_teacher", "deputy_head"];

/**
 * The Workflow Hub's data: everything the signed-in user must act on,
 * assembled from queries the app already runs elsewhere (sidebar badges,
 * dashboards, module pages) - no new collections, rules, or functions.
 * Heavy reads (registry, user accounts) only run for the roles whose
 * rules allow them and whose tasks need them.
 */
export function useMyTasks(): {
  sections: TaskSection[];
  total: number;
  loading: boolean;
} {
  const { profile, school } = useAuth();
  const schoolCode = school?.schoolCode;
  const role = profile?.role ?? "";
  const empNo = profile?.employeeNumber;
  const { academicYearId } = useAcademicContext();

  // "Today" is captured once per mount (kept out of render for purity).
  const [now] = useState(() => Date.now());

  const isReviewer = REVIEWER_ROLES.includes(role);
  const isApprover = APPROVER_ROLES.includes(role);
  const isTransferParty = TRANSFER_ROLES.includes(role);
  const isAdminOrHead = ["school_admin", "head_teacher"].includes(role);
  const isAdmin = role === "school_admin";
  const canExport = EXPORTER_ROLES.includes(role);

  const submissions = useSbaSubmissions(schoolCode);
  const subjects = useSubjects(schoolCode);
  const streams = useStreams(schoolCode);
  const incoming = useIncomingTransfers(isTransferParty ? schoolCode : undefined);
  const outgoing = useOutgoingTransfers(isTransferParty ? schoolCode : undefined);
  const registry = useRegistry(isAdminOrHead ? schoolCode : undefined);
  const users = useSchoolUsers(isAdmin ? schoolCode : undefined);
  const freshSchool = useSchool(canExport ? schoolCode : undefined);

  const subjectName = (code: string) =>
    subjects.data?.find((s) => s.subjectCode === code)?.name ?? code;
  const streamName = (id: string) =>
    streams.data?.find((s) => s.streamId === id)?.name ?? id;

  const yearSubs = (submissions.data ?? []).filter(
    (s) => !academicYearId || s.academicYearId === academicYearId
  );

  const sections: TaskSection[] = [];

  // ---- My score sheets (anyone linked to a teacher record) ----
  if (empNo) {
    const mine = yearSubs.filter((s) => s.teacherId === empNo);
    const items: TaskItem[] = mine
      .filter((s) => s.status === "returned")
      .map((s) => ({
        id: `returned-${s.submissionId}`,
        title: `${subjectName(s.subjectId)} · ${streamName(s.streamId)}`,
        detail: "Returned for correction — fix the marks and resubmit.",
        to: `/assessments/marks?form=${s.academicLevelCode}&stream=${s.streamId}&subject=${s.subjectId}`,
        tone: "red" as const,
      }));

    const drafts = mine.filter((s) => s.status === "draft").length;
    if (drafts > 0) {
      items.push({
        id: "my-drafts",
        title: "Score sheets still in draft",
        detail: "Enter the remaining marks and submit for review.",
        count: drafts,
        to: "/my-classes",
        tone: "blue",
      });
    }
    if (items.length > 0) sections.push({ title: "Your score sheets", items });
  }

  // ---- Approvals & reviews ----
  if (isReviewer || isTransferParty) {
    const items: TaskItem[] = [];

    if (isReviewer) {
      const submitted = yearSubs.filter((s) => s.status === "submitted").length;
      if (submitted > 0)
        items.push({
          id: "review-submitted",
          title: "SBA sheets awaiting moderation",
          detail: "Review each class's marks, then moderate or return.",
          count: submitted,
          to: "/assessments/review",
          tone: "amber",
        });
    }
    if (isApprover) {
      const moderated = yearSubs.filter((s) => s.status === "moderated").length;
      if (moderated > 0)
        items.push({
          id: "review-moderated",
          title: "SBA sheets awaiting final approval",
          detail: "Approving freezes the marks permanently.",
          count: moderated,
          to: "/assessments/review",
          tone: "amber",
        });
    }
    if (isTransferParty) {
      const requested = (incoming.data ?? []).filter(
        (r) => r.status === "requested"
      ).length;
      if (requested > 0)
        items.push({
          id: "transfers-incoming",
          title: "Incoming transfer requests to decide",
          detail: "Preview each envelope, then accept, reject or ask for info.",
          count: requested,
          to: "/transfers",
          tone: "red",
        });
      const info = (outgoing.data ?? []).filter(
        (r) => r.status === "info_requested"
      ).length;
      if (info > 0)
        items.push({
          id: "transfers-info",
          title: "Transfers where the receiving school asked for information",
          detail: "Respond, or cancel and re-send with updated details.",
          count: info,
          to: "/transfers",
          tone: "amber",
        });
    }
    if (items.length > 0)
      sections.push({ title: "Approvals & reviews", items });
  }

  // ---- Administration ----
  if (isAdminOrHead) {
    const items: TaskItem[] = [];
    const rows = registry.data ?? [];

    const unplaced = rows.filter(
      (r) =>
        r.student.status === "active" &&
        r.enrollment?.status === "active" &&
        r.enrollment.streamId === ""
    ).length;
    if (unplaced > 0)
      items.push({
        id: "unplaced",
        title: "Students with no class assigned",
        detail: "Open each profile and place them in a stream.",
        count: unplaced,
        to: "/students/registry",
        tone: "amber",
      });

    const missingExamNo = rows.filter(
      (r) =>
        r.student.status === "active" &&
        r.enrollment?.status === "active" &&
        (SBA_LEVELS as readonly string[]).includes(
          r.enrollment.academicLevelCode
        ) &&
        !r.student.examinationNumber
    ).length;
    if (missingExamNo > 0)
      items.push({
        id: "exam-numbers",
        title: "SBA students without an examination number",
        detail: "Needed before their marks can be exported to ECZ.",
        count: missingExamNo,
        to: "/assessments/exam-numbers",
        tone: "amber",
      });

    if (isAdmin) {
      const tempPw = (users.data ?? []).filter(
        (u) => u.active !== false && u.mustChangePassword
      ).length;
      if (tempPw > 0)
        items.push({
          id: "temp-passwords",
          title: "Staff accounts still on temporary passwords",
          detail: "Remind them to sign in and set their own password.",
          count: tempPw,
          to: "/staff",
          tone: "slate",
        });
    }
    if (items.length > 0) sections.push({ title: "Administration", items });
  }

  // ---- Deadlines ----
  const iso = freshSchool.data?.sbaSubmissionDeadline;
  if (canExport && iso) {
    const deadline = new Date(`${iso}T23:59:59`);
    if (!Number.isNaN(deadline.getTime())) {
      const days = Math.ceil((deadline.getTime() - now) / 86_400_000);
      if (days <= 60) {
        const text = deadline.toLocaleDateString(undefined, {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        sections.push({
          title: "Deadlines",
          items: [
            {
              id: "ecz-deadline",
              title:
                days < 0
                  ? `ECZ SBA submission deadline has passed (${text})`
                  : `SBA scores due to ECZ by ${text}`,
              detail:
                days < 0
                  ? "Export and submit immediately, or record the extension on the School Profile."
                  : `${days} day${days === 1 ? "" : "s"} left — check every sheet is approved, then export.`,
              to: "/assessments/export",
              tone: days < 0 || days <= 14 ? "red" : "amber",
            },
          ],
        });
      }
    }
  }

  const total = sections.reduce(
    (sum, sec) => sum + sec.items.reduce((s, i) => s + (i.count ?? 1), 0),
    0
  );

  const loading =
    submissions.isLoading ||
    incoming.isLoading ||
    outgoing.isLoading ||
    registry.isLoading ||
    users.isLoading;

  return { sections, total, loading };
}
