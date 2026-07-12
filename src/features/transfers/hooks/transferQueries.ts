import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { TransferService } from "../../../domain/transfers/TransferService";
import type { CreateTransferInput } from "../../../domain/transfers/TransferService";
import { ManualTransferService } from "../../../domain/transfers/ManualTransferService";
import type { ManualTransferInput } from "../../../domain/transfers/ManualTransferService";

export function useIncomingTransfers(schoolCode?: string) {
  return useQuery({
    queryKey: ["transfers-in", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => TransferService.listIncoming(schoolCode!),
  });
}

export function useOutgoingTransfers(schoolCode?: string) {
  return useQuery({
    queryKey: ["transfers-out", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => TransferService.listOutgoing(schoolCode!),
  });
}

/** Manual transfer out (receiving school NOT on SIMS): closes the
 * record locally; the paperwork travels with the student. */
export function useManualTransferOut(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      studentNumber: string;
      details: ManualTransferInput;
    }) =>
      ManualTransferService.transferOut(
        schoolCode,
        input.studentNumber,
        input.details
      ),
    onSuccess: (_d, input) => {
      queryClient.invalidateQueries({
        queryKey: ["student", schoolCode, input.studentNumber],
      });
      queryClient.invalidateQueries({ queryKey: ["registry", schoolCode] });
      queryClient.invalidateQueries({
        queryKey: ["student-enrollments", schoolCode, input.studentNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["count-active-students", schoolCode],
      });
      queryClient.invalidateQueries({ queryKey: ["sba-roster"] });
    },
  });
}

export function useCreateTransfer(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransferInput) =>
      TransferService.createRequest(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["transfers-out", schoolCode] }),
  });
}

export function useCancelTransfer(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { requestId: string; actorUid: string }) =>
      TransferService.cancel(input.requestId, input.actorUid),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["transfers-out", schoolCode] }),
  });
}

export function useDecideTransfer(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      requestId: string;
      actorUid: string;
      decision: "accepted" | "rejected" | "info_requested";
      note?: string;
    }) =>
      TransferService.decide(
        input.requestId,
        input.actorUid,
        input.decision,
        input.note
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["transfers-in", schoolCode] }),
  });
}
