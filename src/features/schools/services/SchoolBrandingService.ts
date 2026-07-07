import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "../../../firebase";
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
}
