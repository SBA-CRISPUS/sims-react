export type TransferStatus =
  | "requested"
  | "accepted"
  | "rejected"
  | "info_requested"
  | "completed";

export interface TransferSnapshotEnrollment {
  academicYearId: string;
  academicLevelCode: string;
  streamId: string;
  status: string;
  admissionDate: string | null;
}

export interface TransferSnapshotSba {
  academicLevelCode: string;
  subjectId: string;
  rawScore: number | null; // frozen /100; null if not yet approved
  status: string;
}

/**
 * The "digital transfer envelope": a self-contained, point-in-time copy of
 * the learner's record. The receiving school previews THIS - never the
 * sending school's live collections.
 */
export interface TransferSnapshot {
  identity: {
    learnerId: string | null;
    studentNumber: string;
    firstName: string;
    lastName: string;
    otherNames: string | null;
    gender: string;
    dateOfBirth: string | null;
    nationality: string;
    examinationNumber: string | null;
  };
  enrollments: TransferSnapshotEnrollment[];
  sba: TransferSnapshotSba[];
}

/** Top-level transferRequests/{id} - the only cross-tenant shared surface. */
export interface TransferRequest {
  requestId: string;
  learnerId: string | null;
  studentNumber: string;
  fromSchoolCode: string;
  fromSchoolName: string;
  toSchoolCode: string;
  studentSnapshot: TransferSnapshot;
  reason: string;
  effectiveDate: string;
  status: TransferStatus;
  requestedByUid: string;
  decidedByUid?: string;
  decisionNote?: string;
  requestedAt?: Date;
  decidedAt?: Date;
  completedAt?: Date;
}
