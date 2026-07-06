import { Link } from "react-router-dom";

import type { StudentRow } from "../hooks/studentQueries";
import { fullName } from "../format";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  admitted: "bg-blue-100 text-blue-800",
  applicant: "bg-slate-100 text-slate-700",
  transferred: "bg-amber-100 text-amber-800",
  graduated: "bg-purple-100 text-purple-800",
  withdrawn: "bg-red-100 text-red-800",
  suspended: "bg-red-100 text-red-800",
};

export default function StudentTable({ rows }: { rows: StudentRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="p-6 text-gray-500">No students match these filters.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-gray-500">
          <tr>
            <th className="p-3">Student No.</th>
            <th className="p-3">Name</th>
            <th className="p-3">Level</th>
            <th className="p-3">Stream</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ student, enrollment }) => (
            <tr key={student.studentNumber} className="border-b hover:bg-slate-50">
              <td className="p-3 font-mono">
                <Link
                  to={`/students/${student.studentNumber}`}
                  className="text-blue-700 hover:underline"
                >
                  {student.studentNumber}
                </Link>
              </td>
              <td className="p-3">{fullName(student)}</td>
              <td className="p-3">{enrollment?.academicLevelCode ?? "—"}</td>
              <td className="p-3">{enrollment?.streamId || "—"}</td>
              <td className="p-3">
                <span
                  className={`rounded px-2 py-1 text-xs capitalize ${
                    STATUS_STYLES[student.status] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {student.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
