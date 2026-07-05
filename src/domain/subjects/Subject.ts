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
}
