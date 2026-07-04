import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StreamService } from "../../../domain/academic/StreamService";
import { AcademicStructureService } from "../../../domain/academic/AcademicStructureService";
import type { Stream, StreamInput } from "../../../domain/academic/Stream";

export function useLevels(schoolCode?: string) {
  return useQuery({
    queryKey: ["academic-levels", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => AcademicStructureService.listLevels(schoolCode!),
  });
}

export function useStreams(schoolCode?: string) {
  return useQuery({
    queryKey: ["streams", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => StreamService.listStreams(schoolCode!),
  });
}

export function useAcademicYears(schoolCode?: string) {
  return useQuery({
    queryKey: ["academic-years", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => AcademicStructureService.listYears(schoolCode!),
  });
}

export function useTerms(schoolCode?: string, academicYearId?: string) {
  return useQuery({
    queryKey: ["terms", schoolCode, academicYearId],
    enabled: !!schoolCode && !!academicYearId,
    queryFn: () =>
      AcademicStructureService.listTerms(schoolCode!, academicYearId!),
  });
}

export function useCreateStream(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StreamInput) =>
      StreamService.createStream(schoolCode, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["streams", schoolCode] }),
  });
}

export function useUpdateStream(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      streamId: string;
      patch: Partial<Pick<Stream, "name" | "capacity" | "active">>;
    }) => StreamService.updateStream(schoolCode, input.streamId, input.patch),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["streams", schoolCode] }),
  });
}
