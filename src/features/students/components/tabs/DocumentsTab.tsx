import { useState } from "react";

import type { TabProps } from "./TabProps";
import { useAuth } from "../../../auth/hooks/useAuth";
import {
  useStudentDocuments,
  useUploadDocument,
  useDeleteDocument,
} from "../../hooks/documentQueries";
import { DocumentService } from "../../../../domain/students/DocumentService";
import type {
  StudentDocument,
  StudentDocumentType,
} from "../../../../domain/students/StudentDocument";
import { formatDate } from "../../format";

const TYPES: StudentDocumentType[] = [
  "Birth Certificate",
  "Transfer Letter",
  "Medical Form",
  "Passport Photo",
  "Other",
];

export default function DocumentsTab({ schoolCode, studentNumber }: TabProps) {
  const { profile, firebaseUser } = useAuth();
  // Documents hold sensitive PII; only student-managing staff may view
  // them (matches the storage + firestore rules), so plain teachers get
  // a restricted message instead of a denied read.
  const canManage =
    profile?.role === "school_admin" || profile?.role === "head_teacher";
  const canDelete = profile?.role === "school_admin";

  const { data, isLoading, isError } = useStudentDocuments(
    canManage ? schoolCode : undefined,
    canManage ? studentNumber : undefined
  );
  const upload = useUploadDocument(schoolCode, studentNumber);
  const remove = useDeleteDocument(schoolCode, studentNumber);

  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<StudentDocumentType>("Birth Certificate");
  const [error, setError] = useState<string | null>(null);

  async function onUpload() {
    setError(null);
    if (!file || !firebaseUser) return;
    try {
      await upload.mutateAsync({ file, type, actorUid: firebaseUser.uid });
      setFile(null);
    } catch (err) {
      console.error(err);
      setError("Upload failed. Only PDF and image files up to 10MB are allowed.");
    }
  }

  async function onDownload(document: StudentDocument) {
    try {
      const url = await DocumentService.getDownloadUrl(document.storagePath);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      console.error(err);
    }
  }

  async function onDelete(document: StudentDocument) {
    setError(null);
    try {
      await remove.mutateAsync(document);
    } catch (err) {
      console.error(err);
      setError("Delete failed. Please try again.");
    }
  }

  if (!canManage) {
    return (
      <p className="text-gray-500">
        Documents are visible to student-managing staff only.
      </p>
    );
  }

  const documents = data ?? [];

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="rounded border p-4">
          <p className="font-medium">Upload Document</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as StudentDocumentType)}
              className="border rounded p-2"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />

            <button
              onClick={onUpload}
              disabled={!file || upload.isPending}
              className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-40"
            >
              {upload.isPending ? "Uploading..." : "Upload"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {isLoading && <p className="text-gray-500">Loading documents...</p>}
      {isError && <p className="text-red-600">Failed to load documents.</p>}

      {!isLoading && !isError && documents.length === 0 && (
        <p className="text-gray-500">No documents uploaded.</p>
      )}

      {documents.length > 0 && (
        <ul className="divide-y">
          {documents.map((document) => (
            <li
              key={document.docId}
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="font-medium">{document.type}</p>
                <p className="text-sm text-gray-500">
                  {document.fileName} · {formatDate(document.uploadedAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onDownload(document)}
                  className="text-blue-700 hover:underline"
                >
                  Download
                </button>
                {canDelete && (
                  <button
                    onClick={() => onDelete(document)}
                    disabled={remove.isPending}
                    className="text-red-600 hover:underline disabled:opacity-40"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
