import { useQuery } from "@tanstack/react-query";

import { EnrollmentService } from "../../../domain/students/EnrollmentService";

export function useYearEnrollments(
  schoolCode?: string,
  academicYearId?: string
) {
  return useQuery({
    queryKey: ["enrollments-year", schoolCode, academicYearId],
    enabled: !!schoolCode && !!academicYearId,
    queryFn: () =>
      EnrollmentService.listActiveByYear(schoolCode!, academicYearId!),
  });
}
