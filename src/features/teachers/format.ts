import type { Teacher } from "../../domain/teachers/Teacher";

export function teacherName(teacher: {
  title?: string;
  firstName: string;
  lastName: string;
}): string {
  return [teacher.title, teacher.firstName, teacher.lastName]
    .filter(Boolean)
    .join(" ");
}

const STATUS_LABELS: Record<Teacher["status"], string> = {
  active: "Active",
  on_leave: "On Leave",
  transferred: "Transferred",
  archived: "Archived",
};

export function teacherStatusLabel(status: Teacher["status"]): string {
  return STATUS_LABELS[status] ?? status;
}
