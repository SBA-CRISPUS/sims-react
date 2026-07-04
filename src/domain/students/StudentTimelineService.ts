import type { Student } from "./Student";
import type { Enrollment } from "./Enrollment";
import type { AuditLogEntry } from "./AuditLogEntry";

export interface TimelineEvent {
  date?: Date;
  title: string;
  detail?: string;
}

/**
 * Assembles a learner's chronological history from the events recorded
 * across the system: admission, each enrollment, and audit entries.
 */
export class StudentTimelineService {
  static build(
    student: Student,
    enrollments: Enrollment[],
    audit: AuditLogEntry[]
  ): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    events.push({
      date: student.createdAt,
      title: "Admitted",
      detail: student.admissionId,
    });

    for (const e of enrollments) {
      events.push({
        date: e.admissionDate,
        title: `Enrolled ${e.academicLevelCode}${e.streamId}`,
        detail: e.academicYearId,
      });
    }

    for (const a of audit) {
      events.push({ date: a.at, title: a.action, detail: a.actorUid });
    }

    return events.sort(
      (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)
    );
  }
}
