import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { TeacherService } from "../../../domain/teachers/TeacherService";
import { TeacherRegistrationService } from "../../../domain/teachers/TeacherRegistrationService";
import { IdentityManagementService } from "../../../domain/identity/IdentityManagementService";
import type { TeacherRegistrationRequest } from "../../../domain/teachers/Teacher";

export function useTeachers(schoolCode?: string) {
  return useQuery({
    queryKey: ["teachers", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => TeacherService.listTeachers(schoolCode!),
  });
}

export function useTeacher(schoolCode?: string, employeeNumber?: string) {
  return useQuery({
    queryKey: ["teacher", schoolCode, employeeNumber],
    enabled: !!schoolCode && !!employeeNumber,
    queryFn: () => TeacherService.getTeacher(schoolCode!, employeeNumber!),
  });
}

export function useRegisterTeacher(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { actorUid: string; request: TeacherRegistrationRequest }) =>
      TeacherRegistrationService.register(
        schoolCode,
        input.actorUid,
        input.request
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["teachers", schoolCode] }),
  });
}

export function useCreateTeacherAccount(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employeeNumber: string) =>
      IdentityManagementService.createTeacherAccount({
        schoolCode,
        employeeNumber,
      }),
    onSuccess: (_data, employeeNumber) => {
      queryClient.invalidateQueries({
        queryKey: ["teacher", schoolCode, employeeNumber],
      });
      queryClient.invalidateQueries({ queryKey: ["teachers", schoolCode] });
    },
  });
}
