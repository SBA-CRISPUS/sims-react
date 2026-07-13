import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StudentRegistryService } from "../../../domain/students/StudentRegistryService";
import { StudentProfileService } from "../../../domain/students/StudentProfileService";
import { StudentPlacementService } from "../../../domain/students/StudentPlacementService";
import { StudentEditService } from "../../../domain/students/StudentEditService";
import type { StudentEditPatch } from "../../../domain/students/StudentEditService";
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

/** Correct personal details (typos, DOB) - admin/head, rules enforce. */
export function useUpdateStudentDetails(
  schoolCode?: string,
  studentNumber?: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: StudentEditPatch) =>
      StudentEditService.updateDetails(schoolCode!, studentNumber!, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student", schoolCode, studentNumber],
      });
      queryClient.invalidateQueries({ queryKey: ["registry", schoolCode] });
    },
  });
}

/** Withdraw / reactivate (admin/head): flips the student and their
 * enrollments; rosters and score sheets drop withdrawn students. */
export function useSetWithdrawn(schoolCode?: string, studentNumber?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (withdrawn: boolean) =>
      StudentEditService.setWithdrawn(schoolCode!, studentNumber!, withdrawn),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student", schoolCode, studentNumber],
      });
      queryClient.invalidateQueries({ queryKey: ["registry", schoolCode] });
      queryClient.invalidateQueries({
        queryKey: ["student-enrollments", schoolCode, studentNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["count-active-students", schoolCode],
      });
      queryClient.invalidateQueries({ queryKey: ["sba-roster"] });
    },
  });
}

/** Undo a MANUAL transfer out recorded in error (admin/head). Refuses
 * (service-enforced) unless the student was actually transferred
 * manually - a digital transfer already imported at the receiving
 * school cannot be reversed here. */
export function useUndoManualTransfer(
  schoolCode?: string,
  studentNumber?: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      StudentEditService.undoManualTransfer(schoolCode!, studentNumber!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student", schoolCode, studentNumber],
      });
      queryClient.invalidateQueries({ queryKey: ["registry", schoolCode] });
      queryClient.invalidateQueries({
        queryKey: ["student-enrollments", schoolCode, studentNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["count-active-students", schoolCode],
      });
      queryClient.invalidateQueries({ queryKey: ["sba-roster"] });
    },
  });
}

function invalidatePlacement(
  queryClient: ReturnType<typeof useQueryClient>,
  schoolCode?: string,
  studentNumber?: string
) {
  queryClient.invalidateQueries({
    queryKey: ["student-enrollments", schoolCode, studentNumber],
  });
  queryClient.invalidateQueries({ queryKey: ["registry", schoolCode] });
  queryClient.invalidateQueries({
    queryKey: ["enrollments-year", schoolCode],
  });
  // Rosters now include the learner; occupancy follows via the CF.
  queryClient.invalidateQueries({ queryKey: ["sba-roster"] });
  queryClient.invalidateQueries({ queryKey: ["streams", schoolCode] });
}

export function usePlaceStudent(schoolCode?: string, studentNumber?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (streamCode: string) =>
      StudentPlacementService.placeStudent(
        schoolCode!,
        studentNumber!,
        streamCode
      ),
    onSuccess: () => invalidatePlacement(queryClient, schoolCode, studentNumber),
  });
}

/** Reassign the current enrollment's level and/or stream (fix a misplacement). */
export function useChangePlacement(schoolCode?: string, studentNumber?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      levelCode,
      streamCode,
    }: {
      levelCode: string;
      streamCode: string;
    }) =>
      StudentPlacementService.changePlacement(
        schoolCode!,
        studentNumber!,
        levelCode,
        streamCode
      ),
    onSuccess: () => invalidatePlacement(queryClient, schoolCode, studentNumber),
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
