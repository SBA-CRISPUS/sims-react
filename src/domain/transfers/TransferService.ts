import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../../firebase";
import type {
  TransferRequest,
  TransferSnapshot,
  TransferStatus,
} from "./TransferRequest";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === "function" ? maybe.toDate() : undefined;
}

function mapRequest(data: Record<string, unknown>): TransferRequest {
  return {
    ...data,
    requestedAt: toDate(data.requestedAt),
    decidedAt: toDate(data.decidedAt),
    importErrorAt: toDate(data.importErrorAt),
    completedAt: toDate(data.completedAt),
  } as unknown as TransferRequest;
}

export interface CreateTransferInput {
  fromSchoolCode: string;
  fromSchoolName: string;
  toSchoolCode: string;
  actorUid: string;
  studentNumber: string;
  learnerId: string | null;
  snapshot: TransferSnapshot;
  reason: string;
  effectiveDate: string;
}

// A learner may have at most one transfer in flight from this school.
// completed / rejected / cancelled are terminal, so re-sending after a
// rejection or cancellation (e.g. to refresh a stale envelope) is allowed.
const OPEN_STATUSES = ["requested", "info_requested", "accepted"];

export class TransferService {
  static async createRequest(input: CreateTransferInput): Promise<string> {
    // Equality-only query (no composite index needed): our own outgoing
    // requests for this learner.
    const existing = await getDocs(
      query(
        collection(db, "transferRequests"),
        where("fromSchoolCode", "==", input.fromSchoolCode),
        where("studentNumber", "==", input.studentNumber)
      )
    );
    const open = existing.docs
      .map((d) => d.data())
      .find((d) => OPEN_STATUSES.includes(d.status as string));
    if (open) {
      throw new Error(
        `A transfer for this learner is already in progress (${String(
          open.status
        ).replace("_", " ")} → ${open.toSchoolCode}). Cancel it before sending a new one.`
      );
    }

    const ref = doc(collection(db, "transferRequests"));
    await setDoc(ref, {
      requestId: ref.id,
      learnerId: input.learnerId,
      studentNumber: input.studentNumber,
      fromSchoolCode: input.fromSchoolCode,
      fromSchoolName: input.fromSchoolName,
      toSchoolCode: input.toSchoolCode.trim().toUpperCase(),
      studentSnapshot: input.snapshot,
      reason: input.reason.trim(),
      effectiveDate: input.effectiveDate,
      status: "requested",
      requestedByUid: input.actorUid,
      requestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  /** Requests where this school is the RECEIVER (its inbox). */
  static async listIncoming(schoolCode: string): Promise<TransferRequest[]> {
    const snap = await getDocs(
      query(
        collection(db, "transferRequests"),
        where("toSchoolCode", "==", schoolCode)
      )
    );
    return snap.docs
      .map((d) => mapRequest(d.data()))
      .sort(
        (a, b) => (b.requestedAt?.getTime() ?? 0) - (a.requestedAt?.getTime() ?? 0)
      );
  }

  /** Requests this school SENT. */
  static async listOutgoing(schoolCode: string): Promise<TransferRequest[]> {
    const snap = await getDocs(
      query(
        collection(db, "transferRequests"),
        where("fromSchoolCode", "==", schoolCode)
      )
    );
    return snap.docs
      .map((d) => mapRequest(d.data()))
      .sort(
        (a, b) => (b.requestedAt?.getTime() ?? 0) - (a.requestedAt?.getTime() ?? 0)
      );
  }

  /** Sender withdraws a not-yet-decided request (requested/info_requested).
   * Terminal; the way to refresh a stale envelope is cancel + re-send. */
  static async cancel(requestId: string, actorUid: string): Promise<void> {
    await updateDoc(doc(db, "transferRequests", requestId), {
      status: "cancelled",
      cancelledByUid: actorUid,
      updatedAt: serverTimestamp(),
    });
  }

  /** Receiving school's decision. The 'completed' import is the CF's job. */
  static async decide(
    requestId: string,
    actorUid: string,
    decision: Extract<TransferStatus, "accepted" | "rejected" | "info_requested">,
    note?: string
  ): Promise<void> {
    await updateDoc(doc(db, "transferRequests", requestId), {
      status: decision,
      decidedByUid: actorUid,
      ...(note?.trim() ? { decisionNote: note.trim() } : {}),
      decidedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
