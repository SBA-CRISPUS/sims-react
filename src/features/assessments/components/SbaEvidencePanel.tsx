import { useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { useSchool } from "../../schools/hooks/schoolQueries";
import {
  useSbaEvidence,
  useUploadEvidence,
  useDeleteEvidence,
} from "../hooks/sbaEvidenceQueries";
import { SbaEvidenceService } from "../../../domain/assessments/SbaEvidenceService";
import type { SbaEvidenceItem } from "../../../domain/assessments/SbaEvidenceService";

function sizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Evidence attachments for one class score sheet: photos of student work
 * and marked written work (PDF) kept for ECZ moderation (2-year retention).
 * PAID ADD-ON - renders nothing unless the system administrator has
 * enabled school.features.sbaEvidence for this school.
 */
export default function SbaEvidencePanel({
  schoolCode,
  submissionId,
}: {
  schoolCode: string;
  submissionId: string;
}) {
  const { profile } = useAuth();
  // Fresh read so an add-on enabled by the system administrator shows up
  // without a re-login (the session school is cached at login).
  const school = useSchool(schoolCode);
  const enabled = !!school.data?.features?.sbaEvidence;

  const evidence = useSbaEvidence(enabled ? schoolCode : undefined, submissionId);
  const upload = useUploadEvidence(schoolCode, submissionId);
  const remove = useDeleteEvidence(schoolCode, submissionId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;

  const canDelete = profile?.role === "school_admin";

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;
    setError(null);
    try {
      await upload.mutateAsync({ file, actorUid: profile.uid });
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not upload the file."
      );
    }
  }

  async function onDownload(item: SbaEvidenceItem) {
    setError(null);
    try {
      const url = await SbaEvidenceService.getDownloadUrl(item.storagePath);
      window.open(url, "_blank", "noopener");
    } catch {
      setError("Could not open the file.");
    }
  }

  const items = evidence.data ?? [];

  return (
    <div className="mt-6 rounded-lg bg-white p-6 shadow print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Evidence</h2>
          <p className="text-sm text-gray-500">
            Photos of student work and marked written work (PDF) for ECZ
            moderation. Keep evidence for at least 2 years. Videos are not
            accepted.
          </p>
        </div>
        <div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,application/pdf"
            onChange={onPick}
            className="hidden"
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={upload.isPending}
            className="rounded border border-blue-700 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            {upload.isPending ? "Uploading..." : "Add photo / PDF"}
          </button>
          <p className="mt-1 text-xs text-gray-400">Up to 10MB per file.</p>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {evidence.isLoading ? (
        <p className="mt-4 text-sm text-gray-500">Loading evidence...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No evidence attached to this score sheet yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y">
          {items.map((item) => (
            <li
              key={item.evidenceId}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <div className="min-w-0">
                <button
                  onClick={() => onDownload(item)}
                  className="max-w-full truncate text-sm text-blue-700 hover:underline"
                  title={item.fileName}
                >
                  {item.fileName}
                </button>
                <span className="ml-2 text-xs text-gray-400">
                  {item.contentType === "application/pdf" ? "PDF" : "Photo"} ·{" "}
                  {sizeLabel(item.size)}
                  {item.uploadedAt
                    ? ` · ${item.uploadedAt.toLocaleDateString()}`
                    : ""}
                </span>
              </div>
              {canDelete && (
                <button
                  onClick={() => remove.mutate(item)}
                  disabled={remove.isPending}
                  className="text-sm text-red-600 hover:underline disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
