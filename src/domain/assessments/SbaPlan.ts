/**
 * An SBA assessment plan: the task structure a subject is scored against
 * for one form-year. The structure IS the data - every ECZ subject
 * differs only in its task list, so the engine never hard-codes a
 * subject's formula. Shared by every stream of that form (Biology-F2's
 * tasks are defined once for F2-A and F2-B alike).
 *
 * Stored at schools/{code}/sbaPlans keyed by the deterministic slot id
 * `{academicYearId}_{academicLevelCode}_{subjectId}` (one plan per
 * subject per form-year). SBA runs in Form 2 and Form 3 only.
 */
export interface SbaPlan {
  planId: string;
  academicYearId: string;
  academicLevelCode: string; // F2 | F3
  subjectId: string; // == Subject.subjectCode
  subjectName: string; // denormalized for display
  tasks: SbaTask[]; // typically 11-20
  totalMaxMarks: number; // Σ tasks.maxMarks (denormalized cache; tasks stay the source of truth)
  status: SbaPlanStatus;
  createdByUid: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SbaPlanStatus = "draft" | "published";

/**
 * One SBA task. maxMarks VARIES within a subject (5/10/15/20/31/50/79
 * all appear in the ECZ guides) - never assume a uniform per-task max.
 * termId is set only for term-structured subjects (e.g. Mathematics:
 * 4 tasks per term across 3 terms) and left undefined for annual tasks.
 */
export interface SbaTask {
  taskId: string; // stable within the plan (marks reference it)
  name: string;
  type: string;
  maxMarks: number;
  termId?: string;
}

export interface SbaPlanInput {
  academicYearId: string;
  academicLevelCode: string;
  subjectId: string;
  subjectName: string;
  tasks: SbaTask[];
}

/** The form-years SBA is conducted in (ECSEOL 2026). */
export const SBA_LEVELS = ["F2", "F3"] as const;

/** ECZ SBA task types, for the plan builder's picker. */
export const SBA_TASK_TYPES = [
  "Class Test",
  "Assignment",
  "Practical",
  "Experiment",
  "Project",
  "Presentation",
  "Group Discussion",
  "Portfolio",
  "Peer Review",
  "Field Project",
  "Fieldwork",
  "Observation",
  "Homework",
  "End of Term Test",
  "End of Cycle",
  "Research Project",
  "Coursework",
  "Other",
] as const;

export function sbaPlanId(input: {
  academicYearId: string;
  academicLevelCode: string;
  subjectId: string;
}): string {
  return `${input.academicYearId}_${input.academicLevelCode}_${input.subjectId}`;
}
