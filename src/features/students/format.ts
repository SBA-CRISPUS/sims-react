import type { Student } from "../../domain/students/Student";

export function formatDate(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fullName(student: {
  firstName: string;
  otherNames?: string;
  lastName: string;
}): string {
  return [student.firstName, student.otherNames, student.lastName]
    .filter(Boolean)
    .join(" ");
}

export function studentDisplayName(student: Student): string {
  return fullName(student);
}
