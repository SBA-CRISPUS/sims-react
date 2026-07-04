import { collection, getDocs } from "firebase/firestore";

import { db } from "../../firebase";

import { mapStudent, mapEnrollment } from "./mappers";
import type { Student } from "./Student";
import type { Enrollment } from "./Enrollment";

export interface StudentRow {
  student: Student;
  enrollment?: Enrollment;
}

export interface RegistryFilter {
  search: string;
  level: string;
  stream: string;
  status: string;
  gender: string;
  admissionYear: string;
}

export interface RegistryOptions {
  levels: string[];
  streams: string[];
  admissionYears: string[];
}

export interface DashboardStats {
  total: number;
  active: number;
  graduated: number;
  transferred: number;
  admittedThisMonth: number;
  male: number;
  female: number;
  byLevel: { key: string; count: number }[];
  byStream: { key: string; count: number }[];
  recent: StudentRow[];
}

function fullName(student: Student): string {
  return [student.firstName, student.otherNames, student.lastName]
    .filter(Boolean)
    .join(" ");
}

function admissionYearOf(row: StudentRow): string {
  // academicYearId is "AY-2026"; fall back to the admissionId year.
  const fromYear = row.enrollment?.academicYearId?.replace(/^AY-/, "");
  if (fromYear) return fromYear;
  const fromAdmission = row.student.admissionId?.split("-")[1];
  return fromAdmission ?? "";
}

function tally(
  rows: StudentRow[],
  pick: (row: StudentRow) => string | undefined
): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Business-query layer for the student registry: the current-enrollment
 * join, filtering, filter options, dashboard analytics, and export. Not
 * CRUD - it composes reads into the views the registry and dashboard
 * need.
 */
export class StudentRegistryService {
  /** Where a learner currently sits: the most recent enrollment. */
  static currentEnrollment(enrollments: Enrollment[]): Enrollment | undefined {
    return [...enrollments].sort(
      (a, b) =>
        (b.admissionDate?.getTime() ?? 0) - (a.admissionDate?.getTime() ?? 0)
    )[0];
  }

  static async listRegistry(schoolCode: string): Promise<StudentRow[]> {
    const [studentsSnap, enrollmentsSnap] = await Promise.all([
      getDocs(collection(db, "schools", schoolCode, "students")),
      getDocs(collection(db, "schools", schoolCode, "enrollments")),
    ]);

    const students = studentsSnap.docs.map((d) => mapStudent(d.data()));
    const enrollments = enrollmentsSnap.docs.map((d) => mapEnrollment(d.data()));

    const byStudent = new Map<string, Enrollment[]>();
    for (const e of enrollments) {
      const list = byStudent.get(e.studentId) ?? [];
      list.push(e);
      byStudent.set(e.studentId, list);
    }

    return students
      .map((student) => ({
        student,
        enrollment: this.currentEnrollment(
          byStudent.get(student.studentNumber) ?? []
        ),
      }))
      .sort((a, b) =>
        a.student.studentNumber.localeCompare(b.student.studentNumber)
      );
  }

  static deriveOptions(rows: StudentRow[]): RegistryOptions {
    return {
      levels: [
        ...new Set(
          rows.map((r) => r.enrollment?.academicLevelCode).filter(Boolean)
        ),
      ].sort() as string[],
      streams: [
        ...new Set(rows.map((r) => r.enrollment?.streamId).filter(Boolean)),
      ].sort() as string[],
      admissionYears: [
        ...new Set(rows.map(admissionYearOf).filter(Boolean)),
      ].sort(),
    };
  }

  static filter(rows: StudentRow[], f: RegistryFilter): StudentRow[] {
    const q = f.search.trim().toLowerCase();
    return rows.filter((row) => {
      if (f.level && row.enrollment?.academicLevelCode !== f.level) return false;
      if (f.stream && row.enrollment?.streamId !== f.stream) return false;
      if (f.status && row.student.status !== f.status) return false;
      if (f.gender && row.student.gender !== f.gender) return false;
      if (f.admissionYear && admissionYearOf(row) !== f.admissionYear)
        return false;
      if (q) {
        const haystack = [
          row.student.studentNumber,
          row.student.admissionNumber,
          fullName(row.student),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  static computeStats(rows: StudentRow[]): DashboardStats {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const countStatus = (s: string) =>
      rows.filter((r) => r.student.status === s).length;

    return {
      total: rows.length,
      active: countStatus("active"),
      graduated: countStatus("graduated"),
      transferred: countStatus("transferred"),
      admittedThisMonth: rows.filter(
        (r) => (r.student.createdAt?.getTime() ?? 0) >= monthStart.getTime()
      ).length,
      male: rows.filter((r) => r.student.gender === "Male").length,
      female: rows.filter((r) => r.student.gender === "Female").length,
      byLevel: tally(rows, (r) => r.enrollment?.academicLevelCode),
      byStream: tally(rows, (r) => r.enrollment?.streamId),
      recent: [...rows]
        .sort(
          (a, b) =>
            (b.student.createdAt?.getTime() ?? 0) -
            (a.student.createdAt?.getTime() ?? 0)
        )
        .slice(0, 5),
    };
  }

  static exportCsv(rows: StudentRow[]): void {
    const header = [
      "Student Number",
      "Admission ID",
      "Name",
      "Gender",
      "Level",
      "Stream",
      "Status",
    ];

    const csvCell = (value: string) =>
      /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

    const lines = rows.map((row) =>
      [
        row.student.studentNumber,
        row.student.admissionId ?? "",
        fullName(row.student),
        row.student.gender,
        row.enrollment?.academicLevelCode ?? "",
        row.enrollment?.streamId ?? "",
        row.student.status,
      ]
        .map((v) => csvCell(String(v)))
        .join(",")
    );

    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "students.csv";
    anchor.click();

    URL.revokeObjectURL(url);
  }
}
