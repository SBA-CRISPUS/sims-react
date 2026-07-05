import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../firebase";

import { sbaPlanId } from "./SbaPlan";
import { totalMaxMarks } from "./SbaCalculationService";
import type { SbaPlan, SbaPlanInput, SbaPlanStatus } from "./SbaPlan";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === "function" ? maybe.toDate() : undefined;
}

export class SbaPlanService {
  static async listPlans(schoolCode: string): Promise<SbaPlan[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "sbaPlans")
    );
    return snapshot.docs.map(
      (d) =>
        ({
          ...d.data(),
          createdAt: toDate(d.data().createdAt),
          updatedAt: toDate(d.data().updatedAt),
        }) as SbaPlan
    );
  }

  /**
   * Creates or edits a plan. The deterministic id means one plan per
   * (subject, form-year); re-saving edits it rather than duplicating.
   * createdAt/createdByUid mark the plan's origin and are preserved.
   *
   * A published plan is the structure teachers are already scoring
   * against, so its tasks are frozen: editing must first move it back to
   * draft. New plans start as draft.
   */
  static async savePlan(
    schoolCode: string,
    actorUid: string,
    input: SbaPlanInput
  ): Promise<void> {
    const id = sbaPlanId(input);
    const ref = doc(db, "schools", schoolCode, "sbaPlans", id);

    await runTransaction(db, async (tx) => {
      const existing = await tx.get(ref);
      const status: SbaPlanStatus = existing.exists()
        ? existing.data().status
        : "draft";

      if (existing.exists() && status === "published") {
        throw new Error(
          "This plan is published. Unpublish it before editing its tasks."
        );
      }

      tx.set(ref, {
        planId: id,
        academicYearId: input.academicYearId,
        academicLevelCode: input.academicLevelCode,
        subjectId: input.subjectId,
        subjectName: input.subjectName,
        tasks: input.tasks,
        totalMaxMarks: totalMaxMarks(input.tasks),
        status,
        createdByUid: existing.exists()
          ? existing.data().createdByUid
          : actorUid,
        createdAt: existing.exists()
          ? existing.data().createdAt
          : serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  /**
   * Publish a plan (open it for marks entry) or return it to draft to
   * edit its tasks. Marks-entry and the approval workflow arrive in
   * sprints 5B/5C.
   */
  static async setStatus(
    schoolCode: string,
    planId: string,
    status: SbaPlanStatus
  ): Promise<void> {
    await updateDoc(doc(db, "schools", schoolCode, "sbaPlans", planId), {
      status,
      updatedAt: serverTimestamp(),
    });
  }
}
