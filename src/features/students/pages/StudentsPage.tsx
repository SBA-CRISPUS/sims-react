import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function StudentsPage() {
  const { school } = useAuth();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          {school && (
            <p className="mt-1 text-gray-600">{school.name}</p>
          )}
        </div>

        <Link
          to="/students/admit"
          className="rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800"
        >
          + Admit Student
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total Students" value="—" />
        <StatTile label="Active Students" value="—" />
        <StatTile label="Admissions This Term" value="—" />
        <StatTile label="Transfers" value="—" />
      </div>

      <div className="mt-8 rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold">Recent Admissions</h2>
        <p className="mt-2 text-gray-500">
          No student records yet. Counts and the student list appear here once
          admissions are persisted to Firestore.
        </p>
      </div>
    </div>
  );
}
