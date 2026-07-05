import { StudentProfileService } from "../students/StudentProfileService";
import { SbaMarkService } from "../assessments/SbaMarkService";
import type { TransferSnapshot } from "./TransferRequest";

function isoDate(d?: Date): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/**
 * Builds the digital transfer envelope from the SENDING school's own data
 * (it may read its own learner). Nulls, never undefined, so it stores
 * cleanly in the request document.
 */
export class TransferSnapshotService {
  static async buildForStudent(
    schoolCode: string,
    studentNumber: string
  ): Promise<TransferSnapshot> {
    const [student, enrollments, marks] = await Promise.all([
      StudentProfileService.getStudent(schoolCode, studentNumber),
      StudentProfileService.listStudentEnrollments(schoolCode, studentNumber),
      SbaMarkService.listLearnerMarks(schoolCode, studentNumber),
    ]);
    if (!student) throw new Error("Student not found.");

    return {
      identity: {
        learnerId: student.learnerId ?? null,
        studentNumber: student.studentNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        otherNames: student.otherNames ?? null,
        gender: student.gender,
        dateOfBirth: isoDate(student.dateOfBirth),
        nationality: student.nationality,
        examinationNumber: student.examinationNumber ?? null,
      },
      enrollments: enrollments
        .map((e) => ({
          academicYearId: e.academicYearId,
          academicLevelCode: e.academicLevelCode,
          streamId: e.streamId,
          status: e.status,
          admissionDate: isoDate(e.admissionDate),
        }))
        .sort((a, b) => a.academicYearId.localeCompare(b.academicYearId)),
      sba: marks
        .filter((m) => !m.notTaking)
        .map((m) => ({
          academicLevelCode: m.academicLevelCode,
          subjectId: m.subjectId,
          rawScore: typeof m.rawScore === "number" ? m.rawScore : null,
          status: m.status,
        }))
        .sort(
          (a, b) =>
            a.academicLevelCode.localeCompare(b.academicLevelCode) ||
            a.subjectId.localeCompare(b.subjectId)
        ),
    };
  }
}
