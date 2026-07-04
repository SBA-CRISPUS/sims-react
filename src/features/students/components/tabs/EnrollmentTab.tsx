import type { TabProps } from "./TabProps";
import { useStudentEnrollments } from "../../hooks/studentQueries";
import { formatDate } from "../../format";

export default function EnrollmentTab({ schoolCode, studentNumber }: TabProps) {
  const { data, isLoading, isError } = useStudentEnrollments(
    schoolCode,
    studentNumber
  );

  if (isLoading) return <p className="text-gray-500">Loading enrollments...</p>;
  if (isError) return <p className="text-red-600">Failed to load enrollments.</p>;

  const enrollments = [...(data ?? [])].sort(
    (a, b) => (b.admissionDate?.getTime() ?? 0) - (a.admissionDate?.getTime() ?? 0)
  );

  if (enrollments.length === 0) {
    return <p className="text-gray-500">No enrollment records.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b bg-slate-50 text-gray-500">
        <tr>
          <th className="p-3">Academic Year</th>
          <th className="p-3">Level</th>
          <th className="p-3">Stream</th>
          <th className="p-3">Admission Date</th>
          <th className="p-3">Status</th>
        </tr>
      </thead>
      <tbody>
        {enrollments.map((e, i) => (
          <tr key={i} className="border-b">
            <td className="p-3">{e.academicYearId}</td>
            <td className="p-3">{e.academicLevelCode}</td>
            <td className="p-3">{e.streamId}</td>
            <td className="p-3">{formatDate(e.admissionDate)}</td>
            <td className="p-3 capitalize">{e.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
