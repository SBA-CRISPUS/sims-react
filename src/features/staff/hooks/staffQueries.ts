import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { UserAccountService } from "../../../domain/identity/UserAccountService";
import { IdentityManagementService } from "../../../domain/identity/IdentityManagementService";
import type { CreateStaffAccountRequest } from "../../../domain/identity/IdentityManagementService";

export function useSchoolUsers(schoolCode?: string) {
  return useQuery({
    queryKey: ["school-users", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => UserAccountService.listSchoolUsers(schoolCode!),
  });
}

export function useCreateStaffAccount(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateStaffAccountRequest) =>
      IdentityManagementService.createStaffAccount(request),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["school-users", schoolCode] }),
  });
}

export function useSetUserActive(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { uid: string; active: boolean }) =>
      UserAccountService.setActive(input.uid, input.active),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["school-users", schoolCode] }),
  });
}
