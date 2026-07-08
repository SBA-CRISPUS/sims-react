import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SbaEvidenceService } from "../../../domain/assessments/SbaEvidenceService";
import type { SbaEvidenceItem } from "../../../domain/assessments/SbaEvidenceService";

export function useSbaEvidence(schoolCode?: string, submissionId?: string) {
  return useQuery({
    queryKey: ["sba-evidence", schoolCode, submissionId],
    enabled: !!schoolCode && !!submissionId,
    queryFn: () => SbaEvidenceService.list(schoolCode!, submissionId!),
  });
}

export function useUploadEvidence(schoolCode: string, submissionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, actorUid }: { file: File; actorUid: string }) =>
      SbaEvidenceService.upload(schoolCode, submissionId, file, actorUid),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["sba-evidence", schoolCode, submissionId],
      }),
  });
}

export function useDeleteEvidence(schoolCode: string, submissionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: SbaEvidenceItem) =>
      SbaEvidenceService.remove(schoolCode, submissionId, item),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["sba-evidence", schoolCode, submissionId],
      }),
  });
}
