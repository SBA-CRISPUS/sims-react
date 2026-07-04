import type { StudentStatus } from "../../../domain/students/StudentStatus";

const STATUSES: StudentStatus[] = [
  "applicant",
  "admitted",
  "active",
  "transferred",
  "graduated",
  "withdrawn",
  "suspended",
];

interface Props {
  search: string;
  onSearch: (value: string) => void;
  level: string;
  onLevel: (value: string) => void;
  stream: string;
  onStream: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  levelOptions: string[];
  streamOptions: string[];
}

export default function StudentFilters({
  search,
  onSearch,
  level,
  onLevel,
  stream,
  onStream,
  status,
  onStatus,
  levelOptions,
  streamOptions,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search name or number..."
        className="border rounded p-2"
      />

      <select
        value={level}
        onChange={(e) => onLevel(e.target.value)}
        className="border rounded p-2"
      >
        <option value="">All Levels</option>
        {levelOptions.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      <select
        value={stream}
        onChange={(e) => onStream(e.target.value)}
        className="border rounded p-2"
      >
        <option value="">All Streams</option>
        {streamOptions.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => onStatus(e.target.value)}
        className="border rounded p-2 capitalize"
      >
        <option value="">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s} className="capitalize">
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
