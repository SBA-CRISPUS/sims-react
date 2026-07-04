import { useQuery } from "@tanstack/react-query";

import { StudentService } from "../../../domain/students/StudentService";
import { GuardianService } from "../../../domain/students/GuardianService";

import type { Student } from "../../../domain/students/Student";
import type { Enrollment } from "../../../domain/students/Enrollment";

export interface StudentRow {
  student: Student;
  enrollment?: Enrollment;
}

/**
 * The enrollment that represents where a learner currently sits: the
 * most recent by admission date. (Every enrollment is currently
 * "active", so recency - not status - is what distinguishes a
 * promoted learner's current placement from their prior years.)
 */
export function currentEnrollment(
  enrollments: Enrollment[]
): Enrollment | undefined {
  return [...enrollments].sort(
    (a, b) => (b.admissionDate?.getTime() ?? 0) - (a.admissionDate?.getTime() ?? 0)
  )[0];
}

export function useStudents(schoolCode?: string) {
  return useQuery({
    queryKey: ["students", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => StudentService.listStudents(schoolCode!),
  });
}

export function useEnrollments(schoolCode?: string) {
  return useQuery({
    queryKey: ["enrollments", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => StudentService.listEnrollments(schoolCode!),
  });
}

export function useStudent(schoolCode?: string, studentNumber?: string) {
  return useQuery({
    queryKey: ["student", schoolCode, studentNumber],
    enabled: !!schoolCode && !!studentNumber,
    queryFn: () => StudentService.getStudent(schoolCode!, studentNumber!),
  });
}

export function useStudentEnrollments(
  schoolCode?: string,
  studentNumber?: string
) {
  return useQuery({
    queryKey: ["student-enrollments", schoolCode, studentNumber],
    enabled: !!schoolCode && !!studentNumber,
    queryFn: () =>
      StudentService.listStudentEnrollments(schoolCode!, studentNumber!),
  });
}

export function useStudentAudit(schoolCode?: string, studentNumber?: string) {
  return useQuery({
    queryKey: ["student-audit", schoolCode, studentNumber],
    enabled: !!schoolCode && !!studentNumber,
    queryFn: () => StudentService.listStudentAudit(schoolCode!, studentNumber!),
  });
}

export function useStudentGuardians(
  schoolCode?: string,
  guardianIds?: string[]
) {
  return useQuery({
    queryKey: ["student-guardians", schoolCode, guardianIds],
    enabled: !!schoolCode && !!guardianIds && guardianIds.length > 0,
    queryFn: () =>
      GuardianService.getGuardiansByIds(schoolCode!, guardianIds ?? []),
  });
}

export function useGuardian(schoolCode?: string, guardianId?: string) {
  return useQuery({
    queryKey: ["guardian", schoolCode, guardianId],
    enabled: !!schoolCode && !!guardianId,
    queryFn: () => GuardianService.getGuardian(schoolCode!, guardianId!),
  });
}

export function useGuardianChildren(schoolCode?: string, guardianId?: string) {
  return useQuery({
    queryKey: ["guardian-children", schoolCode, guardianId],
    enabled: !!schoolCode && !!guardianId,
    queryFn: () =>
      GuardianService.listGuardianChildren(schoolCode!, guardianId!),
  });
}
