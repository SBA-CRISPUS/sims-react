import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SchoolService } from "../services/SchoolService";
import { SchoolBrandingService } from "../services/SchoolBrandingService";
import type { SchoolProfilePatch } from "../services/SchoolService";
import type { SchoolFeatures } from "../types";

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

/** All schools on the platform - super_admin only. */
export function useSchools() {
  return useQuery({
    queryKey: ["schools"],
    queryFn: () => SchoolService.listSchools(),
  });
}

/** Flip a paid add-on for a school (super_admin only; rules enforce). */
export function useSetSchoolFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      schoolCode,
      feature,
      enabled,
    }: {
      schoolCode: string;
      feature: keyof SchoolFeatures;
      enabled: boolean;
    }) => SchoolService.setFeature(schoolCode, feature, enabled),
    onSuccess: (_data, { schoolCode }) => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      queryClient.invalidateQueries({ queryKey: ["school", schoolCode] });
    },
  });
}

export function useUploadLogo(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) =>
      SchoolBrandingService.uploadLogo(schoolCode, file),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["school", schoolCode] }),
  });
}
