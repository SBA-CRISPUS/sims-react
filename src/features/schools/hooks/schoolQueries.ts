import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SchoolService } from "../services/SchoolService";
import type { SchoolProfilePatch } from "../services/SchoolService";

export function useSchool(schoolCode?: string) {
  return useQuery({
    queryKey: ["school", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => SchoolService.getSchool(schoolCode!),
  });
}

export function useUpdateSchool(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: SchoolProfilePatch) =>
      SchoolService.updateSchool(schoolCode, patch),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["school", schoolCode] }),
  });
}
