import { useQuery } from "@tanstack/react-query";

import { StudentRegistryService } from "../../../domain/students/StudentRegistryService";
import { StudentProfileService } from "../../../domain/students/StudentProfileService";
import { GuardianService } from "../../../domain/students/GuardianService";

export type { StudentRow } from "../../../domain/students/StudentRegistryService";

export function useRegistry(schoolCode?: string) {
  return useQuery({
    queryKey: ["registry", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => StudentRegistryService.listRegistry(schoolCode!),
  });
}

export function useStudent(schoolCode?: string, studentNumber?: string) {
  return useQuery({
    queryKey: ["student", schoolCode, studentNumber],
    enabled: !!schoolCode && !!studentNumber,
    queryFn: () => StudentProfileService.getStudent(schoolCode!, studentNumber!),
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
      StudentProfileService.listStudentEnrollments(schoolCode!, studentNumber!),
  });
}

export function useStudentAudit(schoolCode?: string, studentNumber?: string) {
  return useQuery({
    queryKey: ["student-audit", schoolCode, studentNumber],
    enabled: !!schoolCode && !!studentNumber,
    queryFn: () =>
      StudentProfileService.listStudentAudit(schoolCode!, studentNumber!),
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
