import type { TabProps } from "./TabProps";
import { useAuth } from "../../../auth/hooks/useAuth";
import {
  useStudentEnrollments,
  useStudentAudit,
} from "../../hooks/studentQueries";
import { StudentTimelineService } from "../../../../domain/students/StudentTimelineService";
import { formatDate } from "../../format";

export default function TimelineTab({
  schoolCode,
  studentNumber,
  student,
}: TabProps) {
  const { profile } = useAuth();
  // auditLogs are readable by admins only; a non-admin querying them
  // would be denied by the rules, so only fetch when permitted.
  const canReadAudit =
    profile?.role === "school_admin" || profile?.role === "super_admin";

  const enrollments = useStudentEnrollments(schoolCode, studentNumber);
  const audit = useStudentAudit(
    canReadAudit ? schoolCode : undefined,
    canReadAudit ? studentNumber : undefined
  );

  const events = StudentTimelineService.build(
    student,
    enrollments.data ?? [],
    audit.data ?? []
  );

  return (
    <ol className="relative border-l border-slate-200 pl-6">
      {events.map((event, i) => (
        <li key={i} className="mb-6">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-blue-700" />
          <p className="font-medium">{event.title}</p>
          <p className="text-sm text-gray-500">
            {formatDate(event.date)}
            {event.detail ? ` · ${event.detail}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
