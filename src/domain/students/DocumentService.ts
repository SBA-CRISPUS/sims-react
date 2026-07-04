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
import { toDate } from "./mappers";
import type {
  StudentDocument,
  StudentDocumentType,
} from "./StudentDocument";

/**
 * Student documents: files live in Firebase Storage, metadata in a
 * per-student Firestore subcollection. The metadata is the source of
 * truth for the UI - Storage is never listed directly.
 */
export class DocumentService {
  static async listDocuments(
    schoolCode: string,
    studentNumber: string
  ): Promise<StudentDocument[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "students", studentNumber, "documents")
    );
    return snapshot.docs
      .map(
        (d) =>
          ({
            ...d.data(),
            uploadedAt: toDate(d.data().uploadedAt),
          }) as StudentDocument
      )
      .sort(
        (a, b) => (b.uploadedAt?.getTime() ?? 0) - (a.uploadedAt?.getTime() ?? 0)
      );
  }

  static async uploadDocument(
    schoolCode: string,
    studentNumber: string,
    file: File,
    type: StudentDocumentType,
    actorUid: string
  ): Promise<void> {
    const metaRef = doc(
      collection(db, "schools", schoolCode, "students", studentNumber, "documents")
    );
    const docId = metaRef.id;
    const storagePath = `schools/${schoolCode}/students/${studentNumber}/documents/${docId}/${file.name}`;

    await uploadBytes(ref(storage, storagePath), file);

    try {
      await setDoc(metaRef, {
        docId,
        type,
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

  static async deleteDocument(
    schoolCode: string,
    studentNumber: string,
    document: StudentDocument
  ): Promise<void> {
    // Metadata is the source of truth for the UI, so remove it first.
    // A failed Storage delete then leaves only an invisible orphan file,
    // never a listed row whose download 404s.
    await deleteDoc(
      doc(
        db,
        "schools",
        schoolCode,
        "students",
        studentNumber,
        "documents",
        document.docId
      )
    );
    await deleteObject(ref(storage, document.storagePath)).catch(
      () => undefined
    );
  }
}
