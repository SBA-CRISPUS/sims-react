import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DocumentService } from "../../../domain/students/DocumentService";
import type { StudentDocumentType } from "../../../domain/students/StudentDocument";
import type { StudentDocument } from "../../../domain/students/StudentDocument";

export function useStudentDocuments(
  schoolCode?: string,
  studentNumber?: string
) {
  return useQuery({
    queryKey: ["student-documents", schoolCode, studentNumber],
    enabled: !!schoolCode && !!studentNumber,
    queryFn: () =>
      DocumentService.listDocuments(schoolCode!, studentNumber!),
  });
}

export function useUploadDocument(schoolCode: string, studentNumber: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      file: File;
      type: StudentDocumentType;
      actorUid: string;
    }) =>
      DocumentService.uploadDocument(
        schoolCode,
        studentNumber,
        input.file,
        input.type,
        input.actorUid
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["student-documents", schoolCode, studentNumber],
      }),
  });
}

export function useDeleteDocument(schoolCode: string, studentNumber: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (document: StudentDocument) =>
      DocumentService.deleteDocument(schoolCode, studentNumber, document),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["student-documents", schoolCode, studentNumber],
      }),
  });
}
