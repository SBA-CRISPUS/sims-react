import { useMemo, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  useAcademicYears,
  useTerms,
  useLevels,
} from "../hooks/streamQueries";
import StreamsTab from "../components/StreamsTab";
import DepartmentsTab from "../components/DepartmentsTab";

const TABS = [
  "Academic Years",
  "Terms",
  "Academic Levels",
  "Streams",
  "Departments",
] as const;
type Tab = (typeof TABS)[number];

function YearsTab({ schoolCode }: { schoolCode?: string }) {
  const { data, isLoading } = useAcademicYears(schoolCode);
  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  const years = data ?? [];
  if (years.length === 0)
    return <p className="text-gray-500">No academic years.</p>;
  return (
    <ul className="divide-y">
      {years.map((y) => (
        <li key={y.academicYearId} className="flex justify-between py-3">
          <span className="font-medium">{y.name}</span>
          <span className="flex gap-2 text-sm">
            {y.current && (
              <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">
                current
              </span>
            )}
            <span className="capitalize text-gray-500">{y.status}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function TermsTab({
  schoolCode,
  currentYearId,
}: {
  schoolCode?: string;
  currentYearId?: string;
}) {
  const { data, isLoading } = useTerms(schoolCode, currentYearId);
  if (!currentYearId)
    return <p className="text-gray-500">No current academic year.</p>;
  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  const terms = data ?? [];
  if (terms.length === 0) return <p className="text-gray-500">No terms.</p>;
  return (
    <ul className="divide-y">
      {terms.map((t) => (
        <li key={t.termId} className="flex justify-between py-3">
          <span className="font-medium">{t.name}</span>
          <span className="flex gap-2 text-sm">
            {t.current && (
              <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">
                current
              </span>
            )}
            {t.locked && (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500">
                locked
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function LevelsTab({ schoolCode }: { schoolCode?: string }) {
  const { data, isLoading } = useLevels(schoolCode);
  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  const levels = data ?? [];
  if (levels.length === 0)
    return <p className="text-gray-500">No academic levels.</p>;
  return (
    <ul className="divide-y">
      {levels.map((l) => (
        <li key={l.levelCode} className="flex justify-between py-3">
          <span className="font-medium">{l.name}</span>
          <span className="text-sm text-gray-500">{l.section ?? ""}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AcademicStructurePage() {
  const { school } = useAuth();
  const schoolCode = school?.schoolCode;
  const [tab, setTab] = useState<Tab>("Streams");

  const years = useAcademicYears(schoolCode);
  const currentYear = useMemo(
    () => (years.data ?? []).find((y) => y.current),
    [years.data]
  );

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold">Academic Structure</h1>
        {school && <p className="mt-1 text-gray-600">{school.name}</p>}
      </div>

      {currentYear && (
        <div className="mt-4 flex gap-6 rounded-lg bg-white p-4 shadow">
          <div>
            <p className="text-sm text-gray-500">Academic Year</p>
            <p className="font-semibold">{currentYear.name}</p>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap px-4 py-2 text-sm ${
              tab === t
                ? "border-b-2 border-blue-700 font-medium text-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        {tab === "Academic Years" && <YearsTab schoolCode={schoolCode} />}
        {tab === "Terms" && (
          <TermsTab
            schoolCode={schoolCode}
            currentYearId={currentYear?.academicYearId}
          />
        )}
        {tab === "Academic Levels" && <LevelsTab schoolCode={schoolCode} />}
        {tab === "Streams" && <StreamsTab />}
        {tab === "Departments" && <DepartmentsTab />}
      </div>
    </div>
  );
}
