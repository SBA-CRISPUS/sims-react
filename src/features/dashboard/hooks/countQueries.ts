import { useQuery } from "@tanstack/react-query";

import {
  countActiveStudents,
  countActiveTeachers,
} from "../../../lib/firestoreCounts";

/** Dashboard headline counts via aggregate queries: ~1 read each
 * instead of scanning every student/teacher document (READ BUDGET). */
export function useActiveStudentCount(schoolCode?: string) {
  return useQuery({
    queryKey: ["count-active-students", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => countActiveStudents(schoolCode!),
  });
}

export function useActiveTeacherCount(schoolCode?: string) {
  return useQuery({
    queryKey: ["count-active-teachers", schoolCode],
    enabled: !!schoolCode,
    queryFn: () => countActiveTeachers(schoolCode!),
  });
}
