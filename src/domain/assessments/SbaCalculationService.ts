import type { SbaTask } from "./SbaPlan";

/**
 * The one calculation the whole SBA engine turns on. Every subject in the
 * ECZ guides reduces to this: a learner's form-year mark is the sum of
 * marks obtained over the sum of the administered tasks' maximum marks.
 * The denominator is NEVER a fixed 100 (Maths totals 240, Commerce 120,
 * Art & Design 200); it is whatever the plan's tasks sum to.
 *
 * Pure functions, no I/O - unit-testable directly against the ECZ worked
 * examples.
 */

export function totalMaxMarks(tasks: SbaTask[]): number {
  return tasks.reduce((sum, t) => sum + (t.maxMarks || 0), 0);
}

export function obtainedTotal(
  taskScores: Record<string, number>,
  tasks: SbaTask[]
): number {
  return tasks.reduce((sum, t) => sum + (taskScores[t.taskId] ?? 0), 0);
}

/**
 * The ECZ SBA raw score for a form-year, normalised to /100 and rounded
 * half-up. This is the RAW mark schools submit to the ECZ portal - the
 * 30%/40% subject weighting is applied CENTRALLY by ECZ and must never be
 * applied here (the single most-repeated instruction in the 2026 guide).
 *
 * Cross-checks against the ECZ worked examples:
 *   English 61/80  -> round(76.25) = 76  (guide ×10 form: 7.625 -> 8)
 *   Maths   203/240 -> round(84.58) = 85 (guide: 8.458 -> 8)
 *   Chemistry 85/100 -> round(85)   = 85 (guide: 8.5 -> 9)
 */
export function sbaRawOutOf100(
  taskScores: Record<string, number>,
  tasks: SbaTask[]
): number {
  const max = totalMaxMarks(tasks);
  if (max <= 0) return 0; // no tasks / zero-mark plan: guard against divide-by-zero
  const got = obtainedTotal(taskScores, tasks);
  return Math.round((got / max) * 100);
}

export type CompetencyBand =
  | "Outstanding"
  | "Advanced"
  | "Basic"
  | "Satisfactory"
  | "Unsatisfactory";

/**
 * PROVISIONAL competency band for a raw SBA percentage. ECZ assigns the
 * real grade on the COMBINED SBA + final-exam mark, so anything shown from
 * this must be labelled provisional / SBA-only in the UI.
 */
export function provisionalBand(rawOutOf100: number): CompetencyBand {
  if (rawOutOf100 >= 70) return "Outstanding";
  if (rawOutOf100 >= 60) return "Advanced";
  if (rawOutOf100 >= 50) return "Basic";
  if (rawOutOf100 >= 40) return "Satisfactory";
  return "Unsatisfactory";
}
