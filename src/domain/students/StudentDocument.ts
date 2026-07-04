export type StudentDocumentType =
  | "Birth Certificate"
  | "Transfer Letter"
  | "Medical Form"
  | "Passport Photo"
  | "Other";

export interface StudentDocument {
  docId: string;
  type: StudentDocumentType;
  fileName: string;
  storagePath: string;
  contentType: string;
  size: number;
  uploadedByUid: string;
  uploadedAt?: Date;
}
