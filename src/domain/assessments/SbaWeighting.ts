/**
 * School-level VIEW of the ECZ subject weighting. Under CBA the final
 * grade is SBA x weight% + exam x (100 - weight)%: weight is 30% for
 * most subjects, 40% for Physical Education and Sport (practical).
 *
 * DISPLAY ONLY. ECZ applies the weighting centrally - SIMS shows the
 * weighted equivalent so the school can see where a student stands,
 * but every file exported FOR ECZ carries raw marks only. Never feed
 * a weighted number into the ECZ export.
 */
export const DEFAULT_SBA_WEIGHT_PERCENT = 30;

/** raw/100 x weight% = the SBA contribution out of `weightPercent`
 * points (e.g. raw 76 at 30% -> 22.8 / 30). Exact to 2 dp. */
export function weightedSba(
  raw100: number,
  weightPercent: number = DEFAULT_SBA_WEIGHT_PERCENT
): number {
  return Math.round(raw100 * weightPercent) / 100;
}

/** The weight to use for a subject: its own override or the 30% norm. */
export function subjectWeightPercent(subject?: {
  sbaWeightPercent?: number;
}): number {
  const w = subject?.sbaWeightPercent;
  return typeof w === "number" && w > 0 && w <= 100
    ? w
    : DEFAULT_SBA_WEIGHT_PERCENT;
}
