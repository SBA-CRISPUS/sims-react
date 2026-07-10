/**
 * A subject a school teaches (e.g. Mathematics / MAT). Referenced by
 * teaching assignments and the SBA engine. Stored under
 * schools/{code}/subjects keyed by the uppercased subject code.
 */
export interface Subject {
  subjectCode: string;
  name: string;
  departmentId: string | null;
  formsOffered: string[];
  sbaEnabled: boolean;
  /** ECZ weighting of SBA in the final grade: 30 for most subjects,
   * 40 for Physical Education and Sport. DISPLAY ONLY - the weighted
   * view is for the school; ECZ exports stay raw. */
  sbaWeightPercent?: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SubjectInput {
  subjectCode: string;
  name: string;
  departmentId: string | null;
  formsOffered: string[];
  sbaEnabled: boolean;
  sbaWeightPercent?: number;
}
