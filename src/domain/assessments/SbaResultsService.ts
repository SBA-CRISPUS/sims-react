import { sbaRawOutOf100, provisionalBand } from "./SbaCalculationService";
import type { SbaMark } from "./SbaMark";
import type { SbaPlan } from "./SbaPlan";
import type { SbaSubmissionStatus } from "./SbaSubmission";

/**
 * Read-side helpers that turn stored marks into the results schools verify
 * before exporting to ECZ. RAW only - the 30/40% weighting is ECZ's, and
 * any band is provisional (ECZ grades the combined SBA + exam).
 */

export interface SbaResult {
  raw: number; // /100
  band: string;
  frozen: boolean; // true once the approval CF has frozen rawScore
  status: SbaSubmissionStatus;
}

/**
 * A learner's result for one class. Uses the frozen snapshot once it
 * exists (post-approval), otherwise computes live from taskScores + plan.
 * Returns null for a learner not taking the subject.
 */
export function resultFor(mark: SbaMark, plan?: SbaPlan): SbaResult | null {
  if (mark.notTaking) return null;
  const frozen = typeof mark.rawScore === "number";
  const raw = frozen
    ? (mark.rawScore as number)
    : plan
      ? sbaRawOutOf100(mark.taskScores, plan.tasks)
      : 0;
  return { raw, band: provisionalBand(raw), frozen, status: mark.status };
}

/** The ECZ two-year combined SBA (Form 2 + Form 3), each scaled to /10. */
export function combinedOutOf20(
  form2Raw: number | null,
  form3Raw: number | null
): number | null {
  if (form2Raw === null && form3Raw === null) return null;
  const f2 = form2Raw === null ? 0 : Math.round(form2Raw / 10);
  const f3 = form3Raw === null ? 0 : Math.round(form3Raw / 10);
  return f2 + f3;
}

// ---- SBA readiness pipeline (school dashboard / radar) ----

export type SbaStage =
  | "planning"
  | "entry"
  | "submitted"
  | "moderated"
  | "approved";

export const STAGE_ORDER: SbaStage[] = [
  "planning",
  "entry",
  "submitted",
  "moderated",
  "approved",
];

export const STAGE_LABEL: Record<SbaStage, string> = {
  planning: "Planning",
  entry: "Marks entry",
  submitted: "Moderation",
  moderated: "Moderated",
  approved: "Ready",
};

export function stageWeight(stage: SbaStage): number {
  return STAGE_ORDER.indexOf(stage);
}

/** The pipeline stage of one class (a subject taught to one stream). */
export function classStage(
  hasPublishedPlan: boolean,
  status?: SbaSubmissionStatus
): SbaStage {
  if (!hasPublishedPlan) return "planning";
  if (!status || status === "draft" || status === "returned") return "entry";
  if (status === "submitted") return "submitted";
  if (status === "moderated") return "moderated";
  return "approved"; // approved | locked
}

/** Rolls class stages up to a subject's overall readiness: the least
 * advanced class sets the headline stage; progress is the average
 * position across classes, 0-100%. */
export function rollUp(stages: SbaStage[]): { stage: SbaStage; progress: number } {
  if (stages.length === 0) return { stage: "planning", progress: 0 };
  const weights = stages.map(stageWeight);
  const min = Math.min(...weights);
  const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
  const maxWeight = STAGE_ORDER.length - 1;
  return {
    stage: STAGE_ORDER[min],
    progress: Math.round((avg / maxWeight) * 100),
  };
}
