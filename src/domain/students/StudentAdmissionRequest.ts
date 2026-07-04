import type { Student } from "./Student";
import type { Guardian } from "./Guardian";
import type { Enrollment } from "./Enrollment";

/**
 * Everything captured by the admission wizard. Fields the service
 * generates or derives are omitted:
 *  - studentNumber/status/timestamps on the student
 *  - guardianId on the guardian (assigned like the student number)
 *  - studentId/timestamps on the enrollment
 */
export interface StudentAdmissionRequest {
  student: Omit<
    Student,
    "studentNumber" | "status" | "createdAt" | "updatedAt"
  >;

  guardian: Omit<Guardian, "guardianId">;

  enrollment: Omit<Enrollment, "studentId" | "createdAt" | "updatedAt">;
}
