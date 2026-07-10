import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CaAssessmentService } from "../../../domain/assessments/CaAssessmentService";
import type { CaAssessmentInput } from "../../../domain/assessments/CaAssessment";

export function useCaAssessments(schoolCode?: string, streamId?: string) {
  return useQuery({
    queryKey: ["ca-assessments", schoolCode, streamId],
    enabled: !!schoolCode && !!streamId,
    queryFn: () => CaAssessmentService.listForStream(schoolCode!, streamId!),
  });
}

export function useCreateCaAssessment(schoolCode: string, streamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      actorUid,
    }: {
      input: CaAssessmentInput;
      actorUid: string;
    }) => CaAssessmentService.create(schoolCode, input, actorUid),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["ca-assessments", schoolCode, streamId],
      }),
  });
}

export function useSaveCaScores(schoolCode: string, streamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assessmentId,
      scores,
      absent,
    }: {
      assessmentId: string;
      scores: Record<string, number>;
      absent: string[];
    }) => CaAssessmentService.saveScores(schoolCode, assessmentId, scores, absent),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["ca-assessments", schoolCode, streamId],
      }),
  });
}

export function useDeleteCaAssessment(schoolCode: string, streamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assessmentId: string) =>
      CaAssessmentService.remove(schoolCode, assessmentId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["ca-assessments", schoolCode, streamId],
      }),
  });
}
