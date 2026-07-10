/**
 * Continuous assessment: the school's own internal tests - class tests,
 * monthly tests, mid-term and end-of-term exams. DELIBERATELY SEPARATE
 * from ECZ SBA: never exported to ECZ, no submit/moderate/approve
 * workflow, no freezing. One document per test event; the class's
 * scores live on the document as a map keyed by student number.
 */
export const CA_TYPES = [
  "Class Test",
  "Monthly Test",
  "Mid-Term Exam",
  "End-of-Term Exam",
  "Other",
] as const;

export type CaType = (typeof CA_TYPES)[number];

export interface CaAssessment {
  assessmentId: string;
  academicYearId: string;
  /** Term the test belongs to (from the header context when created). */
  termId: string | null;
  academicLevelCode: string;
  /** Composite stream id, e.g. "F2-A" - same convention as SBA. */
  streamId: string;
  subjectId: string;
  name: string;
  type: CaType;
  maxMarks: number;
  /** ISO yyyy-mm-dd. */
  date: string;
  /** Raw scores keyed by studentNumber. Missing key = not yet marked. */
  scores: Record<string, number>;
  /** Student numbers marked absent for this test. */
  absent: string[];
  createdByUid: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CaAssessmentInput {
  academicYearId: string;
  termId: string | null;
  academicLevelCode: string;
  streamId: string;
  subjectId: string;
  name: string;
  type: CaType;
  maxMarks: number;
  date: string;
}
