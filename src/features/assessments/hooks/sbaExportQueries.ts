import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SbaMarkService } from "../../../domain/assessments/SbaMarkService";
import { StudentExamNumberService } from "../../../domain/students/StudentExamNumberService";

export function useSubjectMarks(schoolCode?: string, subjectId?: string) {
  return useQuery({
    queryKey: ["sba-subject-marks", schoolCode, subjectId],
    enabled: !!schoolCode && !!subjectId,
    queryFn: () => SbaMarkService.listSubjectMarks(schoolCode!, subjectId!),
  });
}

export function useAllStudents(schoolCode?: string) {
  return useQuery({
    queryKey: ["students-all", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => StudentExamNumberService.listStudents(schoolCode!),
  });
}

export function useSetExamNumbers(schoolCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      rows: { studentNumber: string; examinationNumber: string }[]
    ) => StudentExamNumberService.setExamNumbers(schoolCode, rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students-all", schoolCode] });
      queryClient.invalidateQueries({ queryKey: ["sba-roster", schoolCode] });
    },
  });
}
