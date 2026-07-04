import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StreamService } from "../../../domain/academic/StreamService";
import type { AcademicLevel } from "../../../domain/academic/AcademicLevel";
import type { Stream, StreamInput } from "../../../domain/academic/Stream";

export interface LevelWithStreams {
  level: AcademicLevel;
  streams: Stream[];
}

export function useAcademicStructure(schoolCode?: string) {
  return useQuery({
    queryKey: ["academic-structure", schoolCode],
    enabled: !!schoolCode,
    queryFn: async (): Promise<LevelWithStreams[]> => {
      const levels = await StreamService.listLevels(schoolCode!);
      return Promise.all(
        levels.map(async (level) => ({
          level,
          streams: await StreamService.listStreams(schoolCode!, level.levelCode),
        }))
      );
    },
  });
}

export function useCreateStream(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { levelCode: string; stream: StreamInput }) =>
      StreamService.createStream(schoolCode, input.levelCode, input.stream),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic-structure", schoolCode],
      }),
  });
}

export function useUpdateStream(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      levelCode: string;
      streamCode: string;
      patch: Partial<Pick<Stream, "name" | "capacity" | "active">>;
    }) =>
      StreamService.updateStream(
        schoolCode,
        input.levelCode,
        input.streamCode,
        input.patch
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic-structure", schoolCode],
      }),
  });
}
