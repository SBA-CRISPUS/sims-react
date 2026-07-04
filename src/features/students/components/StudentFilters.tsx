import type { StudentStatus } from "../../../domain/students/StudentStatus";
import type {
  RegistryFilter,
  RegistryOptions,
} from "../../../domain/students/StudentRegistryService";

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
  filter: RegistryFilter;
  onChange: (patch: Partial<RegistryFilter>) => void;
  options: RegistryOptions;
}

export default function StudentFilters({ filter, onChange, options }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
      <input
        value={filter.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Search name or number..."
        className="col-span-2 border rounded p-2"
      />

      <select
        value={filter.level}
        onChange={(e) => onChange({ level: e.target.value })}
        className="border rounded p-2"
      >
        <option value="">All Levels</option>
        {options.levels.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      <select
        value={filter.stream}
        onChange={(e) => onChange({ stream: e.target.value })}
        className="border rounded p-2"
      >
        <option value="">All Streams</option>
        {options.streams.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={filter.gender}
        onChange={(e) => onChange({ gender: e.target.value })}
        className="border rounded p-2"
      >
        <option value="">All Genders</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </select>

      <select
        value={filter.admissionYear}
        onChange={(e) => onChange({ admissionYear: e.target.value })}
        className="border rounded p-2"
      >
        <option value="">All Years</option>
        {options.admissionYears.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <select
        value={filter.status}
        onChange={(e) => onChange({ status: e.target.value })}
        className="border rounded p-2 capitalize md:col-start-3"
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
