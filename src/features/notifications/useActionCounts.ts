import { useAuth } from "../auth/hooks/useAuth";
import {
  useIncomingTransfers,
  useOutgoingTransfers,
} from "../transfers/hooks/transferQueries";
import { useSbaSubmissions } from "../assessments/hooks/sbaMarksQueries";

/**
 * Counts of things the signed-in user must ACT on, keyed by the nav path
 * that leads there (rendered as sidebar badges). Deliberately only
 * actionable states - without per-user read-tracking, a "new info" badge
 * would nag forever; responses that need no action (rejected/completed)
 * are visible on the pages themselves.
 *
 * - /transfers: incoming 'requested' (receiver must decide) + outgoing
 *   'info_requested' (sender must respond: cancel + re-send).
 * - /assessments/review: sheets sitting at submitted/moderated (moderator
 *   or approver must move them).
 * - /assessments/marks: the teacher's OWN returned sheets (must correct
 *   and resubmit).
 * - /tasks: the sum of the above - the My Tasks hub badge. (The hub page
 *   itself surfaces more, e.g. missing exam numbers, but those need
 *   heavier reads than a sidebar rendered on every page should do.)
 */
export function useActionCounts(): Record<string, number> {
  const { profile, school } = useAuth();
  const schoolCode = school?.schoolCode;
  const role = profile?.role ?? "";

  const isTransferParty = [
    "school_admin",
    "head_teacher",
    "deputy_head",
  ].includes(role);
  const isReviewer = [
    "school_admin",
    "head_teacher",
    "deputy_head",
    "hod",
  ].includes(role);
  const isTeacher = role === "teacher";

  // Disabled (undefined schoolCode) for roles that can't read the data.
  const incoming = useIncomingTransfers(isTransferParty ? schoolCode : undefined);
  const outgoing = useOutgoingTransfers(isTransferParty ? schoolCode : undefined);
  const submissions = useSbaSubmissions(
    isReviewer || isTeacher ? schoolCode : undefined
  );

  const transfers =
    (incoming.data ?? []).filter((r) => r.status === "requested").length +
    (outgoing.data ?? []).filter((r) => r.status === "info_requested").length;

  const review = isReviewer
    ? (submissions.data ?? []).filter((s) =>
        ["submitted", "moderated"].includes(s.status)
      ).length
    : 0;

  const returned =
    isTeacher && profile?.employeeNumber
      ? (submissions.data ?? []).filter(
          (s) =>
            s.status === "returned" && s.teacherId === profile.employeeNumber
        ).length
      : 0;

  return {
    "/transfers": transfers,
    "/assessments/review": review,
    "/assessments/marks": returned,
    "/tasks": transfers + review + returned,
  };
}
