import { useAcademicContext } from "../hooks/useAcademicContext";

interface Option {
  value: string;
  label: string;
}

function Selector({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-1">
      <span className="text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded border border-sand bg-white px-2 py-1 text-slate-800 focus:border-blue-700 focus:outline-none disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function AcademicContextBar() {
  const {
    years,
    terms,
    levels,
    streams,
    academicYearId,
    termId,
    academicLevelCode,
    streamId,
    setAcademicYear,
    setTerm,
    setLevel,
    setStream,
  } = useAcademicContext();

  // Only render once the school's academic data is available.
  if (years.length === 0) return null;

  const levelStreams = streams.filter(
    (s) => s.academicLevelCode === academicLevelCode && s.active
  );

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-sand bg-paper-raised px-6 py-2 text-sm">
      <Selector
        label="Year"
        value={academicYearId ?? ""}
        onChange={setAcademicYear}
        options={years.map((y) => ({ value: y.academicYearId, label: y.name }))}
      />
      <Selector
        label="Term"
        value={termId ?? ""}
        onChange={setTerm}
        options={terms.map((t) => ({ value: t.termId, label: t.name }))}
      />
      <Selector
        label="Form"
        value={academicLevelCode ?? ""}
        onChange={(v) => setLevel(v || undefined)}
        options={[
          { value: "", label: "All" },
          ...levels.map((l) => ({ value: l.levelCode, label: l.name })),
        ]}
      />
      <Selector
        label="Stream"
        value={streamId ?? ""}
        onChange={(v) => setStream(v || undefined)}
        disabled={!academicLevelCode}
        options={[
          { value: "", label: "All" },
          ...levelStreams.map((s) => ({ value: s.streamId, label: s.name })),
        ]}
      />
    </div>
  );
}
