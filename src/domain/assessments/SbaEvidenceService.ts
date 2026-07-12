import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import { db, storage } from "../../firebase";

/**
 * One piece of SBA evidence attached to a class score sheet: a photo of
 * learner work (models, performances, projects) or marked written work
 * as PDF - what ECZ moderators sample to verify submitted scores
 * (retention >= 2 years). Photos + written work ONLY: video is refused
 * by design (storage cost control).
 *
 * PAID ADD-ON: the panel only renders when school.features.sbaEvidence
 * is enabled by the system administrator.
 */
export interface SbaEvidenceItem {
  evidenceId: string;
  fileName: string;
  storagePath: string;
  contentType: string;
  size: number;
  uploadedByUid: string;
  uploadedAt?: Date;
}

const MAX_BYTES = 10 * 1024 * 1024;

function isAllowedType(file: File): boolean {
  return file.type.startsWith("image/") || file.type === "application/pdf";
}

export class SbaEvidenceService {
  static async list(
    schoolCode: string,
    submissionId: string
  ): Promise<SbaEvidenceItem[]> {
    const snapshot = await getDocs(
      collection(
        db,
        "schools",
        schoolCode,
        "sbaSubmissions",
        submissionId,
        "evidence"
      )
    );
    return snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          ...data,
          evidenceId: d.id,
          uploadedAt: data.uploadedAt?.toDate?.(),
        } as SbaEvidenceItem;
      })
      .sort(
        (a, b) => (b.uploadedAt?.getTime() ?? 0) - (a.uploadedAt?.getTime() ?? 0)
      );
  }

  static async upload(
    schoolCode: string,
    submissionId: string,
    file: File,
    actorUid: string
  ): Promise<void> {
    if (!isAllowedType(file)) {
      throw new Error(
        "Only photos and written work (PDF) are accepted - videos are not supported."
      );
    }
    if (file.size > MAX_BYTES) {
      throw new Error("File is too large - the limit is 10MB.");
    }

    const metaRef = doc(
      collection(
        db,
        "schools",
        schoolCode,
        "sbaSubmissions",
        submissionId,
        "evidence"
      )
    );
    const storagePath = `schools/${schoolCode}/sbaEvidence/${submissionId}/${metaRef.id}/${file.name}`;

    await uploadBytes(ref(storage, storagePath), file);

    try {
      await setDoc(metaRef, {
        fileName: file.name,
        storagePath,
        contentType: file.type,
        size: file.size,
        uploadedByUid: actorUid,
        uploadedAt: serverTimestamp(),
      });
    } catch (error) {
      // Don't leave an orphaned file if the metadata write fails.
      await deleteObject(ref(storage, storagePath)).catch(() => undefined);
      throw error;
    }
  }

  static getDownloadUrl(storagePath: string): Promise<string> {
    return getDownloadURL(ref(storage, storagePath));
  }

  static async remove(
    schoolCode: string,
    submissionId: string,
    item: SbaEvidenceItem
  ): Promise<void> { 
    // Metadata first: a failed Storage delete leaves an invisible orphan,
    // never a listed row whose download 404s.
    await deleteDoc(
      doc(
        db,
        "schools",
        schoolCode,
        "sbaSubmissions",
        submissionId,
        "evidence",
        item.evidenceId
      )
    );
    await deleteObject(ref(storage, item.storagePath)).catch(() => undefined);
  }
}
