import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PaymentService } from "../../../domain/finance/PaymentService";
import type { RecordPaymentInput } from "../../../domain/finance/PaymentService";

export function useYearPayments(schoolCode?: string, academicYearId?: string) {
  return useQuery({
    queryKey: ["payments", schoolCode, academicYearId],
    enabled: !!schoolCode && !!academicYearId,
    queryFn: () => PaymentService.listByYear(schoolCode!, academicYearId!),
  });
}

export function useFeeStatusMap(schoolCode?: string, academicYearId?: string) {
  return useQuery({
    queryKey: ["fee-status", schoolCode, academicYearId],
    enabled: !!schoolCode && !!academicYearId,
    queryFn: () => PaymentService.listFeeStatus(schoolCode!, academicYearId!),
  });
}

/** One learner's clearance - the report-card gate. */
export function useFeeStatus(
  schoolCode?: string,
  academicYearId?: string,
  studentId?: string
) {
  return useQuery({
    queryKey: ["fee-status", schoolCode, academicYearId, studentId],
    enabled: !!schoolCode && !!academicYearId && !!studentId,
    queryFn: () =>
      PaymentService.getFeeStatus(schoolCode!, academicYearId!, studentId!),
  });
}

export function useRecordPayment(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordPaymentInput) =>
      PaymentService.recordPayment(schoolCode, input),
    onSuccess: (_d, input) =>
      queryClient.invalidateQueries({
        queryKey: ["payments", schoolCode, input.academicYearId],
      }),
  });
}

export function useSetCleared(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      academicYearId: string;
      studentId: string;
      cleared: boolean;
      actorUid: string;
    }) =>
      PaymentService.setCleared(
        schoolCode,
        input.academicYearId,
        input.studentId,
        input.cleared,
        input.actorUid
      ),
    onSuccess: (_d, input) =>
      queryClient.invalidateQueries({
        queryKey: ["fee-status", schoolCode, input.academicYearId],
      }),
  });
}
