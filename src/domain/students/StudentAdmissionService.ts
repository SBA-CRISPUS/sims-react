import type { StudentAdmissionRequest } from "./StudentAdmissionRequest";

/**
 * Admits a learner into a school. Scaffold for now - the workflow is
 * laid out step by step and each step gets a real implementation next
 * sprint (against schools/{schoolCode}/students | guardians |
 * enrollments, using the same counter + audit-log patterns as school
 * provisioning).
 */
export class StudentAdmissionService {
  static async admit(request: StudentAdmissionRequest) {
    console.log("Student Admission");
    console.table(request);

    // Step 1 - Validate (admission number unique, required fields)

    // Step 2 - Generate student number (system/counters.nextStudentNumber)

    // Step 3 - Create guardian (or link an existing one)

    // Step 4 - Create student (schools/{schoolCode}/students/{studentNumber})

    // Step 5 - Create enrollment (schools/{schoolCode}/enrollments)

    // Step 6 - Write audit log

    return request;
  }
}
