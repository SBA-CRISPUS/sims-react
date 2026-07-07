export const PAYMENT_METHODS = [
  "Cash",
  "Mobile Money",
  "Bank",
  "Cheque",
  "Other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * One ledger entry in the school's fee register (private / grant-aided
 * schools - government schools are fee-free by law). Append-only:
 * corrections are new negative "adjustment" entries, never edits, so the
 * ledger stays an audit trail.
 */
export interface Payment {
  paymentId: string;
  studentId: string; // studentNumber
  academicYearId: string;
  termId: string | null;
  amount: number; // positive = payment, negative = adjustment/refund
  method: PaymentMethod;
  reference: string | null; // receipt no. / transaction id
  note: string | null;
  recordedByUid: string;
  recordedAt?: Date;
}

/**
 * Per-learner clearance for one academic year - the switch that releases
 * report cards. Explicit (finance decides), not derived from a fee amount:
 * fee structures, bursaries and payment plans vary too much to automate
 * in the MVP.
 */
export interface FeeStatus {
  studentId: string;
  academicYearId: string;
  cleared: boolean;
  updatedByUid: string;
  updatedAt?: Date;
}

export function feeStatusId(academicYearId: string, studentId: string): string {
  return `${academicYearId}_${studentId}`;
}
