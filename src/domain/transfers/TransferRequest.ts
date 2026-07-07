export type TransferStatus =
  | "requested"
  | "accepted"
  | "rejected"
  | "info_requested"
  // Sender withdrew before the receiver decided. Terminal - a fresh
  // request (with a fresh envelope) is the way to "edit" a transfer.
  | "cancelled"
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

export interface TransferSnapshotGuardian {
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string;
  alternativePhone: string | null;
  email: string | null;
  address: string | null;
}

/** CBC flags carried on the student record. */
export interface TransferSnapshotCbc {
  pathway: string | null;
  specialNeeds: boolean;
  boarding: boolean;
  transport: boolean;
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
  /** Absent on requests sent before guardians joined the envelope. */
  guardians?: TransferSnapshotGuardian[];
  cbc?: TransferSnapshotCbc | null;
}

/** Top-level transferRequests/{id} - the only cross-tenant shared surface. */
export interface TransferRequest {
  requestId: string;
  /** Human-readable transfer number (TRF-YYYY-NNNNNN), minted by the CF
   * from a global counter ~seconds after creation - what schools quote
   * and audit logs reference. */
  transferNumber?: string;
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
  cancelledByUid?: string;
  /** Written by onTransferAccepted: the learner's number AT THE RECEIVER. */
  importedStudentNumber?: string;
  requestedAt?: Date;
  decidedAt?: Date;
  completedAt?: Date;
}
