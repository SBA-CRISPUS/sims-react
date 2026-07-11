import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SchoolService } from "../services/SchoolService";
import { SchoolBrandingService } from "../services/SchoolBrandingService";
import type { SchoolProfilePatch } from "../services/SchoolService";
import type {
  School,
  SchoolFeatures,
  SubscriptionLedgerEntry,
} from "../types";

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

/** Subscription tier / status (super_admin only; rules enforce). */
export function useUpdateEntitlements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      schoolCode,
      patch,
    }: {
      schoolCode: string;
      patch: Partial<
        Pick<
          School,
          "subscription" | "status" | "subscriptionExpiresAt" | "ownership"
        >
      >;
    }) => SchoolService.updateEntitlements(schoolCode, patch),
    onSuccess: (_data, { schoolCode }) => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      queryClient.invalidateQueries({ queryKey: ["school", schoolCode] });
    },
  });
}

/** Platform billing history for one school (loaded when expanded). */
export function useSubscriptionLedger(schoolCode?: string) {
  return useQuery({
    queryKey: ["subscription-ledger", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => SchoolService.listSubscriptionLedger(schoolCode!),
  });
}

export function useAddSubscriptionEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      schoolCode,
      entry,
      actorUid,
    }: {
      schoolCode: string;
      entry: Omit<
        SubscriptionLedgerEntry,
        "entryId" | "recordedByUid" | "recordedAt"
      >;
      actorUid: string;
    }) => SchoolService.addSubscriptionEntry(schoolCode, entry, actorUid),
    onSuccess: (_data, { schoolCode }) =>
      queryClient.invalidateQueries({
        queryKey: ["subscription-ledger", schoolCode],
      }),
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
