import { SubjectService } from "../subjects/SubjectService";
import { StreamService } from "../academic/StreamService";
import { streamId as makeStreamId } from "../academic/Stream";
import { TeacherService } from "../teachers/TeacherService";
import { TeacherRegistrationService } from "../teachers/TeacherRegistrationService";
import { StudentAdmissionService } from "../students/StudentAdmissionService";
import { StudentExamNumberService } from "../students/StudentExamNumberService";
import { SbaMarkService } from "../assessments/SbaMarkService";
import { TeachingAssignmentService } from "../teaching/TeachingAssignmentService";
import type { GuardianRelationship } from "../students/Guardian";

const FIRST_NAMES = [
  "Mary", "John", "Grace", "David", "Sarah", "Michael", "Precious", "Bwalya",
  "Mutale", "Chanda", "Natasha", "Peter", "Kelvin", "Charity", "Sandra", "Brian",
  "Mwila", "Chola", "Thandiwe", "Joseph",
];
const LAST_NAMES = [
  "Banda", "Phiri", "Mwansa", "Zulu", "Mwale", "Tembo", "Sakala", "Daka",
  "Kabwe", "Lungu", "Mumba", "Chanda", "Ngoma", "Sinkala",
];

const DEMO_TEACHER_EMAIL = "john.banda@demo.sims";
const DEMO_SUBJECT = { code: "MATH", name: "Mathematics" };

export interface SeedInput {
  schoolCode: string;
  actorUid: string;
  academicYearId: string;
  termId: string;
  levelCode: string; // e.g. "F2"
  streamCode: string; // e.g. "A"
  learnerCount: number;
  onLog: (message: string) => void;
}

/**
 * Seeds a realistic SBA test fixture by driving the same domain services
 * the UI uses - so it runs entirely under the signed-in school_admin's
 * permissions (no Admin SDK, no rule bypass) and writes to the live
 * project. Idempotent where it can be: the subject/stream are created once
 * and the teacher/learners are only topped up to the target.
 *
 * DEV/TEST ONLY. Writes real data - point it at a test school.
 */
export class SbaDemoSeeder {
  static async seed(input: SeedInput): Promise<void> {
    const { schoolCode, actorUid, academicYearId, termId, levelCode, streamCode, onLog } = input;
    const sid = makeStreamId(levelCode, streamCode);

    // 1. Subject
    try {
      await SubjectService.createSubject(schoolCode, {
        subjectCode: DEMO_SUBJECT.code,
        name: DEMO_SUBJECT.name,
        departmentId: null,
        formsOffered: [levelCode],
        sbaEnabled: true,
      });
      onLog(`✓ Subject ${DEMO_SUBJECT.code} created (SBA enabled, ${levelCode}).`);
    } catch {
      onLog(`• Subject ${DEMO_SUBJECT.code} already exists — skipped.`);
    }

    // 2. Stream
    try {
      await StreamService.createStream(schoolCode, {
        academicLevelCode: levelCode,
        streamCode,
        name: `${levelCode} ${streamCode.toUpperCase()}`,
        capacity: 50,
      });
      onLog(`✓ Stream ${sid} created.`);
    } catch {
      onLog(`• Stream ${sid} already exists — skipped.`);
    }

    // 3. Teacher (reuse the demo teacher if already seeded)
    const teachers = await TeacherService.listTeachers(schoolCode);
    let employeeNumber = teachers.find((t) => t.email === DEMO_TEACHER_EMAIL)?.employeeNumber;
    if (employeeNumber) {
      onLog(`• Teacher ${employeeNumber} already exists — reused.`);
    } else {
      const res = await TeacherRegistrationService.register(schoolCode, actorUid, {
        title: "Mr",
        firstName: "John",
        lastName: "Banda",
        gender: "Male",
        phone: "0970000000",
        email: DEMO_TEACHER_EMAIL,
        departmentId: null,
        employmentType: "Full-time",
        qualification: "BSc Ed (Mathematics)",
        tscNumber: "TSC-DEMO-1",
      });
      employeeNumber = res.employeeNumber;
      onLog(`✓ Teacher ${employeeNumber} (John Banda) registered.`);
    }

    // 4. Learners — top up to the target for this class/year
    const existing = await SbaMarkService.listRoster(schoolCode, academicYearId, sid);
    const toAdmit = Math.max(0, input.learnerCount - existing.length);
    onLog(`• ${existing.length} learner(s) already in ${sid}; admitting ${toAdmit} more...`);

    const stamp = Date.now().toString(36);
    for (let i = 0; i < toAdmit; i++) {
      const firstName = FIRST_NAMES[(existing.length + i) % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(existing.length + i) % LAST_NAMES.length];
      const gender = (existing.length + i) % 2 === 0 ? "Female" : "Male";
      const dob = new Date(new Date().getFullYear() - 14, i % 12, (i % 27) + 1);
      try {
        const res = await StudentAdmissionService.admit(schoolCode, actorUid, {
          student: {
            admissionNumber: `DEMO-${stamp}-${i + 1}`,
            firstName,
            lastName,
            gender,
            dateOfBirth: dob,
            nationality: "Zambian",
          },
          guardian: {
            firstName: "Guardian",
            lastName,
            relationship: (gender === "Female" ? "Mother" : "Father") as GuardianRelationship,
            phone: `09710000${String(i).padStart(2, "0")}`,
          },
          enrollment: {
            academicYearId,
            academicLevelCode: levelCode,
            streamId: sid,
            admissionDate: new Date(),
            status: "active",
          },
        });
        onLog(`  ✓ Admitted ${res.studentNumber} — ${firstName} ${lastName}.`);
      } catch (e) {
        onLog(`  ✗ Admission failed: ${e instanceof Error ? e.message : "error"}`);
        throw e; // counter contention / offline — stop rather than corrupt sequence
      }
    }

    // 5. Teaching assignment (deterministic slot — idempotent upsert)
    await TeachingAssignmentService.saveAssignment(schoolCode, actorUid, {
      teacherId: employeeNumber!,
      academicYearId,
      termId,
      subjectId: DEMO_SUBJECT.code,
      academicLevelCode: levelCode,
      streamId: sid,
      periodsPerWeek: 5,
      classTeacher: true,
    });
    onLog(`✓ Teaching assignment: ${employeeNumber} → ${DEMO_SUBJECT.code} → ${sid}.`);

    // 6. Examination numbers for learners that lack one
    const roster = await SbaMarkService.listRoster(schoolCode, academicYearId, sid);
    const year = new Date().getFullYear();
    const missing = roster.filter((s) => !s.examinationNumber);
    if (missing.length > 0) {
      await StudentExamNumberService.setExamNumbers(
        schoolCode,
        missing.map((s, idx) => ({
          studentNumber: s.studentNumber,
          examinationNumber: `${year}/${String(idx + 1).padStart(4, "0")}`,
        }))
      );
      onLog(`✓ Assigned examination numbers to ${missing.length} learner(s).`);
    } else {
      onLog(`• All learners already have examination numbers.`);
    }

    onLog(`Done. Open SBA Plans → create a Mathematics ${levelCode} plan to start the smoke test.`);
  }
}
