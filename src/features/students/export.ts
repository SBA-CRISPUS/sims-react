import type { StudentRow } from "./hooks/studentQueries";
import { fullName } from "./format";

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportStudentsCsv(rows: StudentRow[]): void {
  const header = [
    "Student Number",
    "Admission ID",
    "Name",
    "Gender",
    "Level",
    "Stream",
    "Status",
  ];

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
