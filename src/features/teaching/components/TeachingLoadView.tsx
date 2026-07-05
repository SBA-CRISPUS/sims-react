import { TeachingLoadService } from "../../../domain/teaching/TeachingLoadService";
import type { TeachingAssignment } from "../../../domain/teaching/TeachingAssignment";
import type { Subject } from "../../../domain/subjects/Subject";
import type { Stream } from "../../../domain/academic/Stream";

interface Props {
  assignments: TeachingAssignment[];
  subjectByCode: Map<string, Subject>;
  streamById: Map<string, Stream>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

export default function TeachingLoadView({
  assignments,
  subjectByCode,
  streamById,
}: Props) {
  const load = TeachingLoadService.compute(assignments);
  const heavy = load.workloadPercentage >= 85;

  if (assignments.length === 0) {
    return <p className="text-gray-500">No teaching assignments.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Periods / week" value={load.periodsAssigned} />
        <Metric label="Subjects" value={load.subjectsAssigned} />
        <Metric label="Classes" value={load.streamsAssigned} />
        <Metric
          label="Workload"
          value={`${load.workloadPercentage}%${heavy ? " · heavy" : ""}`}
        />
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-gray-500">
          <tr>
            <th className="p-3">Subject</th>
            <th className="p-3">Class</th>
            <th className="p-3">Periods</th>
            <th className="p-3">Class Teacher</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr key={a.id} className="border-b">
              <td className="p-3">
                {subjectByCode.get(a.subjectId)?.name ?? a.subjectId}
              </td>
              <td className="p-3">
                {streamById.get(a.streamId)?.name ?? a.streamId}
              </td>
              <td className="p-3">{a.periodsPerWeek}</td>
              <td className="p-3">{a.classTeacher ? "Yes" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
