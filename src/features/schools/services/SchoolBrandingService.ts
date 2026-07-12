import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { deleteField, doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db, storage } from "../../../firebase";
import { SchoolService } from "./SchoolService";

/**
 * The school's logo: one file at a fixed Storage path (re-uploading
 * replaces it), with the download URL denormalized onto the school doc so
 * headers and printed documents render it without touching Storage.
 */
export class SchoolBrandingService {
  static async uploadLogo(schoolCode: string, file: File): Promise<string> {
    if (!file.type.startsWith("image/")) {
      throw new Error("The logo must be an image (PNG or JPG work best).");
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("The logo must be smaller than 2MB.");
    }
    const path = `schools/${schoolCode}/branding/logo`;
    await uploadBytes(ref(storage, path), file, { contentType: file.type });
    const logoUrl = await getDownloadURL(ref(storage, path));
    await SchoolService.updateSchool(schoolCode, { logoUrl });
    return logoUrl;
  }

  /** The Head Teacher's / Deputy's signature image, printed on official
   * documents. Same fixed-path pattern as the logo (re-upload replaces);
   * the branding Storage rule already covers this path (admin-only
   * write, image <= 2MB). A scan of the signature on white paper works
   * best - PNG with transparency looks cleanest. */
  static async uploadSignature(schoolCode: string, file: File): Promise<string> {
    if (!file.type.startsWith("image/")) {
      throw new Error("The signature must be an image (PNG or JPG).");
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("The signature image must be smaller than 2MB.");
    }
    const path = `schools/${schoolCode}/branding/signature`;
    await uploadBytes(ref(storage, path), file, { contentType: file.type });
    const signatureUrl = await getDownloadURL(ref(storage, path));
    await SchoolService.updateSchool(schoolCode, { signatureUrl });
    return signatureUrl;
  }

  /** Removes the logo: clears the field first (source of truth for the
   * UI - the header and every print page fall back to "no logo"
   * immediately), then best-effort deletes the Storage file. A failed
   * Storage delete just leaves an unreferenced orphan file, never a
   * broken image link. */
  static async removeLogo(schoolCode: string): Promise<void> {
    await updateDoc(doc(db, "schools", schoolCode), {
      logoUrl: deleteField(),
      updatedAt: serverTimestamp(),
    });
    await deleteObject(ref(storage, `schools/${schoolCode}/branding/logo`)).catch(
      () => undefined
    );
  }

  /** Removes the signature - see removeLogo for the ordering rationale. */
  static async removeSignature(schoolCode: string): Promise<void> {
    await updateDoc(doc(db, "schools", schoolCode), {
      signatureUrl: deleteField(),
      updatedAt: serverTimestamp(),
    });
    await deleteObject(
      ref(storage, `schools/${schoolCode}/branding/signature`)
    ).catch(() => undefined);
  }
}
