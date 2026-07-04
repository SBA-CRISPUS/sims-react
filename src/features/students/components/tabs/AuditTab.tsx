import type { TabProps } from "./TabProps";
import { useAuth } from "../../../auth/hooks/useAuth";
import { useStudentAudit } from "../../hooks/studentQueries";
import { formatDate } from "../../format";

export default function AuditTab({ schoolCode, studentNumber }: TabProps) {
  const { profile } = useAuth();
  const canView =
    profile?.role === "school_admin" || profile?.role === "super_admin";

  const { data, isLoading, isError } = useStudentAudit(
    canView ? schoolCode : undefined,
    canView ? studentNumber : undefined
  );

  if (!canView) {
    return (
      <p className="text-gray-500">
        Audit history is visible to school administrators only.
      </p>
    );
  }

  if (isLoading) return <p className="text-gray-500">Loading audit trail...</p>;
  if (isError) return <p className="text-red-600">Failed to load audit trail.</p>;

  const entries = data ?? [];

  if (entries.length === 0) {
    return <p className="text-gray-500">No audit entries.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b bg-slate-50 text-gray-500">
        <tr>
          <th className="p-3">When</th>
          <th className="p-3">Action</th>
          <th className="p-3">Actor</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id} className="border-b">
            <td className="p-3">{formatDate(e.at)}</td>
            <td className="p-3 font-mono">{e.action}</td>
            <td className="p-3 font-mono text-xs">{e.actorUid ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
