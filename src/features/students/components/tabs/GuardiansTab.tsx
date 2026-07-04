import { Link } from "react-router-dom";

import type { TabProps } from "./TabProps";
import { useStudentGuardians } from "../../hooks/studentQueries";
import { fullName } from "../../format";

export default function GuardiansTab({ schoolCode, student }: TabProps) {
  const { data, isLoading, isError } = useStudentGuardians(
    schoolCode,
    student.guardianIds
  );

  if (isLoading) return <p className="text-gray-500">Loading guardians...</p>;
  if (isError) return <p className="text-red-600">Failed to load guardians.</p>;

  const guardians = data ?? [];

  if (guardians.length === 0) {
    return <p className="text-gray-500">No guardians linked.</p>;
  }

  return (
    <div className="space-y-3">
      {guardians.map((g) => (
        <div
          key={g.guardianId}
          className="flex items-center justify-between rounded border p-4"
        >
          <div>
            <Link
              to={`/students/guardians/${g.guardianId}`}
              className="font-medium text-blue-700 hover:underline"
            >
              {fullName(g)}
            </Link>
            <p className="text-sm text-gray-500">
              {g.relationship} · {g.phone}
            </p>
          </div>
          {g.email && <p className="text-sm text-gray-500">{g.email}</p>}
        </div>
      ))}
    </div>
  );
}
