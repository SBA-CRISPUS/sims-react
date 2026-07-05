import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SbaPlanService } from "../../../domain/assessments/SbaPlanService";
import type {
  SbaPlanInput,
  SbaPlanStatus,
} from "../../../domain/assessments/SbaPlan";

export function useSbaPlans(schoolCode?: string) {
  return useQuery({
    queryKey: ["sba-plans", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => SbaPlanService.listPlans(schoolCode!),
  });
}

export function useSavePlan(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { actorUid: string; plan: SbaPlanInput }) =>
      SbaPlanService.savePlan(schoolCode, input.actorUid, input.plan),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["sba-plans", schoolCode] }),
  });
}

export function useSetPlanStatus(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { planId: string; status: SbaPlanStatus }) =>
      SbaPlanService.setStatus(schoolCode, input.planId, input.status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["sba-plans", schoolCode] }),
  });
}
