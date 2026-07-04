import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  useAcademicYears,
  useTerms,
  useLevels,
  useStreams,
} from "../hooks/streamQueries";
import { AcademicContext } from "./AcademicContext";
import type { AcademicContextValue } from "./AcademicContext";

interface Selection {
  academicYearId?: string;
  termId?: string;
  academicLevelCode?: string;
  streamId?: string;
}

function storageKey(schoolCode: string) {
  return `sims.academicContext.${schoolCode}`;
}

function loadSelection(schoolCode?: string): Selection {
  if (!schoolCode) return {};
  const raw = localStorage.getItem(storageKey(schoolCode));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Selection;
  } catch {
    return {};
  }
}

export function AcademicContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { school } = useAuth();
  const schoolCode = school?.schoolCode;

  // Only the user's EXPLICIT choices are stored; anything unset follows
  // the live "current" defaults, so a new academic year is picked up
  // automatically. Hydrated once from localStorage at mount.
  const [selection, setSelection] = useState<Selection>(() =>
    loadSelection(schoolCode)
  );

  const years = useAcademicYears(schoolCode);
  const yearsData = useMemo(() => years.data ?? [], [years.data]);
  const levels = useLevels(schoolCode);
  const levelsData = useMemo(() => levels.data ?? [], [levels.data]);
  const streams = useStreams(schoolCode);
  const streamsData = useMemo(() => streams.data ?? [], [streams.data]);

  // A persisted id that no longer exists (e.g. a deleted year) is
  // treated as unset so the default takes over, rather than sticking a
  // dead id that resolves to nothing and desyncs the header select.
  const validYear =
    selection.academicYearId &&
    yearsData.some((y) => y.academicYearId === selection.academicYearId)
      ? selection.academicYearId
      : undefined;
  const academicYearId =
    validYear ??
    (yearsData.find((y) => y.current) ?? yearsData[0])?.academicYearId;

  const terms = useTerms(schoolCode, academicYearId);
  const termsData = useMemo(() => terms.data ?? [], [terms.data]);

  const validTerm =
    selection.termId && termsData.some((t) => t.termId === selection.termId)
      ? selection.termId
      : undefined;
  const termId =
    validTerm ??
    (termsData.find((t) => t.current) ?? termsData[0])?.termId;

  const academicLevelCode =
    selection.academicLevelCode &&
    levelsData.some((l) => l.levelCode === selection.academicLevelCode)
      ? selection.academicLevelCode
      : undefined;

  const streamId =
    selection.streamId &&
    streamsData.some(
      (s) =>
        s.streamId === selection.streamId &&
        s.academicLevelCode === academicLevelCode
    )
      ? selection.streamId
      : undefined;

  // Persist the explicit selection (not the derived defaults).
  useEffect(() => {
    if (!schoolCode) return;
    localStorage.setItem(storageKey(schoolCode), JSON.stringify(selection));
  }, [schoolCode, selection]);

  const value = useMemo<AcademicContextValue>(() => {
    return {
      academicYearId,
      termId,
      academicLevelCode,
      streamId,
      academicYear: yearsData.find((y) => y.academicYearId === academicYearId),
      term: termsData.find((t) => t.termId === termId),
      level: levelsData.find((l) => l.levelCode === academicLevelCode),
      stream: streamsData.find((s) => s.streamId === streamId),
      years: yearsData,
      terms: termsData,
      levels: levelsData,
      streams: streamsData,
      // Changing the year clears the term so it re-defaults.
      setAcademicYear: (id: string) =>
        setSelection((p) => ({ ...p, academicYearId: id, termId: undefined })),
      setTerm: (id: string) => setSelection((p) => ({ ...p, termId: id })),
      // Changing the level clears a now-invalid stream.
      setLevel: (code: string | undefined) =>
        setSelection((p) => ({
          ...p,
          academicLevelCode: code,
          streamId: undefined,
        })),
      setStream: (id: string | undefined) =>
        setSelection((p) => ({ ...p, streamId: id })),
    };
  }, [
    academicYearId,
    termId,
    academicLevelCode,
    streamId,
    yearsData,
    termsData,
    levelsData,
    streamsData,
  ]);

  return (
    <AcademicContext.Provider value={value}>
      {children}
    </AcademicContext.Provider>
  );
}
