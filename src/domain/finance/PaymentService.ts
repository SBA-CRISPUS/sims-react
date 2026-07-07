import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "../../firebase";
import { feeStatusId } from "./Payment";
import type { FeeStatus, Payment, PaymentMethod } from "./Payment";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === "function" ? maybe.toDate() : undefined;
}

export interface RecordPaymentInput {
  studentId: string;
  academicYearId: string;
  termId: string | null;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  actorUid: string;
}

export class PaymentService {
  /** The year's whole ledger in one read (single-field equality query);
   * per-learner totals are aggregated client-side. */
  static async listByYear(
    schoolCode: string,
    academicYearId: string
  ): Promise<Payment[]> {
    const snapshot = await getDocs(
      query(
        collection(db, "schools", schoolCode, "payments"),
        where("academicYearId", "==", academicYearId)
      )
    );
    return snapshot.docs
      .map(
        (d) =>
          ({
            ...d.data(),
            paymentId: d.id,
            recordedAt: toDate(d.data().recordedAt),
          }) as Payment
      )
      .sort(
        (a, b) => (b.recordedAt?.getTime() ?? 0) - (a.recordedAt?.getTime() ?? 0)
      );
  }

  static async recordPayment(
    schoolCode: string,
    input: RecordPaymentInput
  ): Promise<void> {
    if (!input.amount || Number.isNaN(input.amount)) {
      throw new Error("Enter an amount (negative for an adjustment/refund).");
    }
    await addDoc(collection(db, "schools", schoolCode, "payments"), {
      studentId: input.studentId,
      academicYearId: input.academicYearId,
      termId: input.termId ?? null,
      amount: input.amount,
      method: input.method,
      reference: input.reference?.trim() || null,
      note: input.note?.trim() || null,
      recordedByUid: input.actorUid,
      recordedAt: serverTimestamp(),
    });
  }

  static async listFeeStatus(
    schoolCode: string,
    academicYearId: string
  ): Promise<Map<string, FeeStatus>> {
    const snapshot = await getDocs(
      query(
        collection(db, "schools", schoolCode, "feeStatus"),
        where("academicYearId", "==", academicYearId)
      )
    );
    const map = new Map<string, FeeStatus>();
    for (const d of snapshot.docs) {
      const status = {
        ...d.data(),
        updatedAt: toDate(d.data().updatedAt),
      } as FeeStatus;
      map.set(status.studentId, status);
    }
    return map;
  }

  static async getFeeStatus(
    schoolCode: string,
    academicYearId: string,
    studentId: string
  ): Promise<FeeStatus | null> {
    const snapshot = await getDoc(
      doc(
        db,
        "schools",
        schoolCode,
        "feeStatus",
        feeStatusId(academicYearId, studentId)
      )
    );
    return snapshot.exists() ? (snapshot.data() as FeeStatus) : null;
  }

  static async setCleared(
    schoolCode: string,
    academicYearId: string,
    studentId: string,
    cleared: boolean,
    actorUid: string
  ): Promise<void> {
    await setDoc(
      doc(
        db,
        "schools",
        schoolCode,
        "feeStatus",
        feeStatusId(academicYearId, studentId)
      ),
      {
        studentId,
        academicYearId,
        cleared,
        updatedByUid: actorUid,
        updatedAt: serverTimestamp(),
      }
    );
  }
}
