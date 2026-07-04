import type { Student } from "../../../../domain/students/Student";

export interface TabProps {
  schoolCode: string;
  studentNumber: string;
  student: Student;
}
