import type { Student } from "./Student";
import type { Enrollment } from "./Enrollment";
import type { AuditLogEntry } from "./AuditLogEntry";

export function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === "function" ? maybe.toDate() : undefined;
}

export function mapStudent(data: Record<string, unknown>): Student {
  return {
    ...data,
    dateOfBirth: toDate(data.dateOfBirth),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as unknown as Student;
}

export function mapEnrollment(data: Record<string, unknown>): Enrollment {
  return {
    ...data,
    admissionDate: toDate(data.admissionDate),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as unknown as Enrollment;
}

export function mapAuditEntry(
  id: string,
  data: Record<string, unknown>
): AuditLogEntry {
  return {
    id,
    action: data.action as string,
    studentNumber: data.studentNumber as string | undefined,
    admissionId: data.admissionId as string | undefined,
    actorUid: data.actorUid as string | undefined,
    at: toDate(data.at),
  };
}
