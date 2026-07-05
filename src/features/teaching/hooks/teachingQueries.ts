import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { TeachingAssignmentService } from "../../../domain/teaching/TeachingAssignmentService";
import type { TeachingAssignmentInput } from "../../../domain/teaching/TeachingAssignment";

export function useTeachingAssignments(schoolCode?: string) {
  return useQuery({
    queryKey: ["teaching-assignments", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => TeachingAssignmentService.listAssignments(schoolCode!),
  });
}

export function useSaveAssignment(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { actorUid: string; assignment: TeachingAssignmentInput }) =>
      TeachingAssignmentService.saveAssignment(
        schoolCode,
        input.actorUid,
        input.assignment
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["teaching-assignments", schoolCode],
      }),
  });
}

export function useDeactivateAssignment(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      TeachingAssignmentService.deactivateAssignment(schoolCode, id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["teaching-assignments", schoolCode],
      }),
  });
}
