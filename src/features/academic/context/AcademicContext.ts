import { createContext } from "react";

import type { AcademicYear, Term } from "../../../domain/academic/AcademicYear";
import type { AcademicLevel } from "../../../domain/academic/AcademicLevel";
import type { Stream } from "../../../domain/academic/Stream";

/**
 * The academic context every module opens in: the user picks year /
 * term / (optionally) form / stream once, and every page reads it.
 * Persisted in localStorage per school - not Firestore.
 */
export interface AcademicContextValue {
  // Selected ids
  academicYearId?: string;
  termId?: string;
  academicLevelCode?: string;
  streamId?: string;

  // Resolved entities for the current selection
  academicYear?: AcademicYear;
  term?: Term;
  level?: AcademicLevel;
  stream?: Stream;

  // Available options
  years: AcademicYear[];
  terms: Term[];
  levels: AcademicLevel[];
  streams: Stream[];

  setAcademicYear: (id: string) => void;
  setTerm: (id: string) => void;
  setLevel: (code: string | undefined) => void;
  setStream: (id: string | undefined) => void;
}

export const AcademicContext = createContext<AcademicContextValue | null>(null);
