import { Link, useParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useGuardian, useGuardianChildren } from "../hooks/studentQueries";
import { fullName } from "../format";

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}

export default function GuardianProfilePage() {
  const { guardianId } = useParams<{ guardianId: string }>();
  const { school } = useAuth();
  const schoolCode = school?.schoolCode;

  const guardianQuery = useGuardian(schoolCode, guardianId);
  const childrenQuery = useGuardianChildren(schoolCode, guardianId);

  if (guardianQuery.isLoading) {
    return <div className="p-8 text-gray-500">Loading guardian...</div>;
  }

  const guardian = guardianQuery.data;

  if (guardianQuery.isError || !guardian) {
    return (
      <div className="p-8">
        <p className="text-red-600">Guardian not found.</p>
        <Link to="/students" className="text-blue-700 hover:underline">
          Back to Students
        </Link>
      </div>
    );
  }

  const children = childrenQuery.data ?? [];

  return (
    <div className="p-8">
      <Link to="/students" className="text-sm text-blue-700 hover:underline">
        ← Back to Students
      </Link>

      <h1 className="mt-3 text-3xl font-bold">{fullName(guardian)}</h1>
      <p className="mt-1 font-mono text-gray-600">{guardian.guardianId}</p>

      <div className="mt-6 grid grid-cols-2 gap-6 rounded-lg bg-white p-6 shadow md:grid-cols-3">
        <Field label="Relationship" value={guardian.relationship} />
        <Field label="Phone" value={guardian.phone} />
        <Field label="Alternative Phone" value={guardian.alternativePhone} />
        <Field label="Email" value={guardian.email} />
        <Field label="Address" value={guardian.address} />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Children</h2>
      <div className="mt-3 rounded-lg bg-white shadow">
        {childrenQuery.isLoading && (
          <p className="p-6 text-gray-500">Loading children...</p>
        )}
        {!childrenQuery.isLoading && children.length === 0 && (
          <p className="p-6 text-gray-500">No linked students.</p>
        )}
        {children.length > 0 && (
          <ul className="divide-y">
            {children.map((child) => (
              <li key={child.studentNumber} className="p-4">
                <Link
                  to={`/students/${child.studentNumber}`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {fullName(child)}
                </Link>
                <span className="ml-2 font-mono text-sm text-gray-500">
                  {child.studentNumber}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
