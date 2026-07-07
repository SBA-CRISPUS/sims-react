import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SbaMarkService } from "../../../domain/assessments/SbaMarkService";
import { SbaSubmissionService } from "../../../domain/assessments/SbaSubmissionService";
import { sbaSubmissionId } from "../../../domain/assessments/SbaSubmission";
import type {
  MarkDraft,
} from "../../../domain/assessments/SbaMarkService";
import type { SbaSubmissionMeta } from "../../../domain/assessments/SbaSubmission";

export function useSbaRoster(
  schoolCode?: string,
  academicYearId?: string,
  streamId?: string
) {
  return useQuery({
    queryKey: ["sba-roster", schoolCode, academicYearId, streamId],
    enabled: !!schoolCode && !!academicYearId && !!streamId,
    queryFn: () =>
      SbaMarkService.listRoster(schoolCode!, academicYearId!, streamId!),
  });
}

export function useSbaSubmission(schoolCode?: string, submissionId?: string) {
  return useQuery({
    queryKey: ["sba-submission", schoolCode, submissionId],
    enabled: !!schoolCode && !!submissionId,
    queryFn: () => SbaSubmissionService.getSubmission(schoolCode!, submissionId!),
  });
}

export function useSbaSubmissions(schoolCode?: string) {
  return useQuery({
    queryKey: ["sba-submissions", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => SbaSubmissionService.listSubmissions(schoolCode!),
  });
}

export function useSbaSubmissionEvents(
  schoolCode?: string,
  submissionId?: string
) {
  return useQuery({
    queryKey: ["sba-events", schoolCode, submissionId],
    enabled: !!schoolCode && !!submissionId,
    queryFn: () => SbaSubmissionService.listEvents(schoolCode!, submissionId!),
  });
}

export function useSbaMarks(schoolCode?: string, submissionId?: string) {
  return useQuery({
    queryKey: ["sba-marks", schoolCode, submissionId],
    enabled: !!schoolCode && !!submissionId,
    queryFn: () => SbaMarkService.listMarks(schoolCode!, submissionId!),
  });
}

export function useStreamSbaMarks(schoolCode?: string, streamId?: string) {
  return useQuery({
    queryKey: ["sba-stream-marks", schoolCode, streamId],
    enabled: !!schoolCode && !!streamId,
    queryFn: () => SbaMarkService.listStreamMarks(schoolCode!, streamId!),
  });
}

export function useLearnerSbaMarks(schoolCode?: string, studentNumber?: string) {
  return useQuery({
    queryKey: ["sba-learner-marks", schoolCode, studentNumber],
    enabled: !!schoolCode && !!studentNumber,
    queryFn: () =>
      SbaMarkService.listLearnerMarks(schoolCode!, studentNumber!),
  });
}

export function useSaveMarks(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      actorUid: string;
      meta: SbaSubmissionMeta;
      submissionExists: boolean;
      rows: MarkDraft[];
    }) => {
      // Ensure the workflow doc exists the first time a class is scored;
      // after that, mark writes are pure (offline-friendly) batch sets.
      if (!input.submissionExists) {
        await SbaSubmissionService.ensureDraft(
          schoolCode,
          input.actorUid,
          input.meta
        );
      }
      await SbaMarkService.saveMarks(
        schoolCode,
        input.actorUid,
        input.meta,
        input.rows
      );
    },
    onSuccess: (_data, input) => {
      const id = sbaSubmissionId(input.meta);
      queryClient.invalidateQueries({
        queryKey: ["sba-marks", schoolCode, id],
      });
      queryClient.invalidateQueries({
        queryKey: ["sba-submission", schoolCode, id],
      });
    },
  });
}

export type SbaSubmissionActionType =
  | "submit"
  | "withdraw"
  | "moderate"
  | "approve"
  | "return";

const ACTION_FNS: Record<
  SbaSubmissionActionType,
  (
    schoolCode: string,
    actorUid: string,
    submissionId: string,
    comment?: string
  ) => Promise<void>
> = {
  submit: SbaSubmissionService.submit.bind(SbaSubmissionService),
  withdraw: SbaSubmissionService.withdraw.bind(SbaSubmissionService),
  moderate: SbaSubmissionService.moderate.bind(SbaSubmissionService),
  approve: SbaSubmissionService.approve.bind(SbaSubmissionService),
  return: SbaSubmissionService.returnForCorrection.bind(SbaSubmissionService),
};

export function useSubmissionAction(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      actorUid: string;
      submissionId: string;
      action: SbaSubmissionActionType;
      comment?: string;
    }) =>
      ACTION_FNS[input.action](
        schoolCode,
        input.actorUid,
        input.submissionId,
        input.comment
      ),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ["sba-submission", schoolCode, input.submissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["sba-marks", schoolCode, input.submissionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["sba-submissions", schoolCode],
      });
      queryClient.invalidateQueries({
        queryKey: ["sba-events", schoolCode, input.submissionId],
      });
    },
  });
}
