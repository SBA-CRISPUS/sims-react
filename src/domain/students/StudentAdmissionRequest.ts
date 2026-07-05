import type { Student } from "./Student";
import type { Guardian } from "./Guardian";
import type { Enrollment } from "./Enrollment";

/**
 * Everything captured by the admission wizard. Fields the service
 * generates or derives are omitted:
 *  - studentNumber/status/timestamps on the student
 *  - admissionNumber (auto-set to the generated admissionId)
 *  - guardianId on the guardian (assigned like the student number)
 *  - studentId/timestamps on the enrollment
 *
 * emisNumber (the school's Ministry EMIS code) is supplied by the caller
 * from the school profile, not typed per admission.
 */
export interface StudentAdmissionRequest {
  student: Omit<
    Student,
    | "studentNumber"
    | "status"
    | "admissionId"
    | "admissionNumber"
    | "guardianIds"
    | "admittedByUid"
    | "createdAt"
    | "updatedAt"
  >;

  guardian: Omit<Guardian, "guardianId">;

  enrollment: Omit<Enrollment, "studentId" | "createdAt" | "updatedAt">;
}
