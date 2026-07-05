import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SubjectService } from "../../../domain/subjects/SubjectService";
import { DepartmentService } from "../../../domain/academic/DepartmentService";
import type { Subject, SubjectInput } from "../../../domain/subjects/Subject";

export function useSubjects(schoolCode?: string) {
  return useQuery({
    queryKey: ["subjects", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => SubjectService.listSubjects(schoolCode!),
  });
}

export function useDepartments(schoolCode?: string) {
  return useQuery({
    queryKey: ["departments", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => DepartmentService.listDepartments(schoolCode!),
  });
}

export function useCreateSubject(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubjectInput) =>
      SubjectService.createSubject(schoolCode, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["subjects", schoolCode] }),
  });
}

export function useUpdateSubject(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      subjectCode: string;
      patch: Partial<
        Pick<
          Subject,
          "name" | "departmentId" | "formsOffered" | "sbaEnabled" | "active"
        >
      >;
    }) => SubjectService.updateSubject(schoolCode, input.subjectCode, input.patch),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["subjects", schoolCode] }),
  });
}
