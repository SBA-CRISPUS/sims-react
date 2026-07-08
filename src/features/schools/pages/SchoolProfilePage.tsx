import { useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  useSchool,
  useUpdateSchool,
  useUploadLogo,
} from "../hooks/schoolQueries";
import { DEFAULT_GRADING_SCALE } from "../types";
import type { GradingBand, School } from "../types";
import type { SchoolProfilePatch } from "../services/SchoolService";

export default function SchoolProfilePage() {
  const { school: sessionSchool, profile } = useAuth();
  const schoolCode = sessionSchool?.schoolCode;
  const canEdit = profile?.role === "school_admin";

  const school = useSchool(schoolCode);
  const update = useUpdateSchool(schoolCode ?? "");

  if (!schoolCode) {
    return (
      <div className="p-8 text-gray-600">
        No school is linked to this account.
      </div>
    );
  }
  if (school.isLoading) {
    return <div className="p-8 text-gray-500">Loading school profile...</div>;
  }
  if (!school.data) {
    return <div className="p-8 text-red-600">School profile not found.</div>;
  }

  return (
    <SchoolProfileForm
      key={schoolCode}
      school={school.data}
      canEdit={canEdit}
      saving={update.isPending}
      saved={update.isSuccess}
      onSave={(patch) => update.mutate(patch)}
    />
  );
}

function SchoolProfileForm({
  school,
  canEdit,
  saving,
  saved,
  onSave,
}: {
  school: School;
  canEdit: boolean;
  saving: boolean;
  saved: boolean;
  onSave: (patch: SchoolProfilePatch) => void;
}) {
  const [name, setName] = useState(school.name);
  const [schoolType, setSchoolType] = useState(school.schoolType);
  const [ownership, setOwnership] = useState(school.ownership);
  const [principal, setPrincipal] = useState(school.principal ?? "");
  const [motto, setMotto] = useState(school.motto ?? "");
  const [phone, setPhone] = useState(school.contact?.phone ?? "");
  const [email, setEmail] = useState(school.contact?.email ?? "");
  const [website, setWebsite] = useState(school.website ?? "");
  const [province, setProvince] = useState(school.location?.province ?? "");
  const [district, setDistrict] = useState(school.location?.district ?? "");
  const [address, setAddress] = useState(school.location?.address ?? "");
  const [postalAddress, setPostalAddress] = useState(school.postalAddress ?? "");
  const [examCentreNumber, setExamCentreNumber] = useState(
    school.examCentreNumber ?? ""
  );
  const [sbaDeadline, setSbaDeadline] = useState(
    school.sbaSubmissionDeadline ?? ""
  );
  const [scale, setScale] = useState<GradingBand[]>(
    school.gradingScale?.length ? school.gradingScale : DEFAULT_GRADING_SCALE
  );

  function save() {
    onSave({
      name: name.trim(),
      schoolType,
      ownership,
      principal: principal.trim(),
      motto: motto.trim(),
      website: website.trim(),
      postalAddress: postalAddress.trim(),
      location: {
        province: province.trim(),
        district: district.trim(),
        address: address.trim(),
      },
      contact: { phone: phone.trim(), email: email.trim() },
      examCentreNumber: examCentreNumber.trim(),
      sbaSubmissionDeadline: sbaDeadline,
      gradingScale: [...scale]
        .filter((b) => b.label.trim())
        .map((b) => ({
          min: Math.max(0, Math.min(100, Math.round(b.min))),
          max: Math.max(0, Math.min(100, Math.round(b.max))),
          label: b.label.trim(),
        }))
        .sort((a, b) => a.min - b.min),
    });
  }

  const ro = !canEdit;

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">School Profile</h1>
          <p className="mt-1 font-mono text-gray-600">{school.schoolCode}</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            {saved && !saving && (
              <span className="text-sm text-green-700">Saved ✓</span>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        )}
      </div>

      <Section title="General">
        <Text label="School name" value={name} onChange={setName} ro={ro} />
        <Select
          label="School type"
          value={schoolType}
          onChange={(v) => setSchoolType(v as School["schoolType"])}
          options={["Primary", "Secondary", "Combined", "Technical"]}
          ro={ro}
        />
        <Select
          label="Ownership"
          value={ownership}
          onChange={(v) => setOwnership(v as School["ownership"])}
          options={["Government", "Grant Aided", "Private"]}
          ro={ro}
        />
        <Text label="Principal / Head" value={principal} onChange={setPrincipal} ro={ro} />
        <Text label="Motto" value={motto} onChange={setMotto} ro={ro} />
      </Section>

      <LogoSection school={school} canEdit={canEdit} />

      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-1 text-lg font-semibold">Grading scale</h2>
        <p className="mb-4 text-sm text-gray-500">
          Printed at the bottom of every report card so parents and other
          stakeholders can read the scores. Bands are inclusive, out of 100.
        </p>
        <div className="space-y-2">
          {scale.map((band, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={band.min}
                disabled={ro}
                onChange={(e) =>
                  setScale((s) =>
                    s.map((b, j) =>
                      j === i ? { ...b, min: Number(e.target.value) } : b
                    )
                  )
                }
                className="w-20 rounded border p-2 disabled:bg-slate-50"
              />
              <span className="text-gray-500">–</span>
              <input
                type="number"
                min={0}
                max={100}
                value={band.max}
                disabled={ro}
                onChange={(e) =>
                  setScale((s) =>
                    s.map((b, j) =>
                      j === i ? { ...b, max: Number(e.target.value) } : b
                    )
                  )
                }
                className="w-20 rounded border p-2 disabled:bg-slate-50"
              />
              <input
                value={band.label}
                disabled={ro}
                placeholder="Label (e.g. Excellent)"
                onChange={(e) =>
                  setScale((s) =>
                    s.map((b, j) =>
                      j === i ? { ...b, label: e.target.value } : b
                    )
                  )
                }
                className="w-48 rounded border p-2 disabled:bg-slate-50"
              />
              {!ro && scale.length > 1 && (
                <button
                  onClick={() => setScale((s) => s.filter((_, j) => j !== i))}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        {!ro && (
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={() =>
                setScale((s) => [...s, { min: 0, max: 0, label: "" }])
              }
              className="text-sm text-blue-700 hover:underline"
            >
              + Add band
            </button>
            <button
              onClick={() => setScale(DEFAULT_GRADING_SCALE)}
              className="text-sm text-gray-500 hover:underline"
            >
              Reset to default
            </button>
            <span className="text-xs text-gray-400">
              Remember to Save changes above.
            </span>
          </div>
        )}
      </div>

      <Section title="Contact">
        <Text label="Phone" value={phone} onChange={setPhone} ro={ro} />
        <Text label="Email" value={email} onChange={setEmail} ro={ro} />
        <Text label="Website" value={website} onChange={setWebsite} ro={ro} />
      </Section>

      <Section title="Location">
        <Text label="Province" value={province} onChange={setProvince} ro={ro} />
        <Text label="District" value={district} onChange={setDistrict} ro={ro} />
        <Text label="Physical address" value={address} onChange={setAddress} ro={ro} />
        <Text label="Postal address" value={postalAddress} onChange={setPostalAddress} ro={ro} />
      </Section>

      <Section title="ECZ examinations">
        <Text
          label="Examination centre number"
          value={examCentreNumber}
          onChange={setExamCentreNumber}
          ro={ro}
        />
        <div>
          <label className="block text-sm text-gray-600">
            SBA submission deadline
          </label>
          <input
            type="date"
            value={sbaDeadline}
            onChange={(e) => setSbaDeadline(e.target.value)}
            disabled={ro}
            className="mt-1 w-full rounded border p-2 disabled:bg-slate-50 disabled:text-gray-500"
          />
          {!ro && (
            <button
              onClick={() =>
                setSbaDeadline(`${new Date().getFullYear() + 1}-01-31`)
              }
              className="mt-1 text-xs text-blue-700 hover:underline"
            >
              Set to 31 Jan {new Date().getFullYear() + 1} (ECZ norm)
            </button>
          )}
        </div>
        <p className="col-span-full text-xs text-gray-500">
          The centre number is printed on the ECZ SBA score export. ECZ
          normally requires SBA scores by 31 January of the following year —
          the date is kept editable here in case it is changed or extended.
        </p>
      </Section>

      <Section title="Registration & subscription">
        <ReadOnly label="School code" value={school.schoolCode} />
        <ReadOnly label="EMIS code (Ministry)" value={school.emisCode || "—"} />
        <ReadOnly label="Subscription" value={school.subscription} />
        <ReadOnly label="Status" value={school.status} />
        <p className="col-span-full text-xs text-gray-500">
          EMIS code, subscription and status are set by your provider / the
          Ministry and can't be changed here.
        </p>
      </Section>
    </div>
  );
}

function LogoSection({ school, canEdit }: { school: School; canEdit: boolean }) {
  const upload = useUploadLogo(school.schoolCode);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      await upload.mutateAsync(file);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not upload the logo."
      );
    }
  }

  return (
    <div className="mt-6 rounded-lg bg-white p-6 shadow">
      <h2 className="mb-1 text-lg font-semibold">Branding</h2>
      <p className="mb-4 text-sm text-gray-500">
        The logo appears in the app header and on printed documents (report
        cards, transcripts, certificates).
      </p>
      <div className="flex items-center gap-5">
        {school.logoUrl ? (
          <img
            src={school.logoUrl}
            alt={`${school.name} logo`}
            className="h-20 w-20 rounded border bg-white object-contain p-1"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded border border-dashed text-xs text-gray-400">
            No logo
          </div>
        )}
        {canEdit && (
          <div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              onChange={onPick}
              className="hidden"
            />
            <button
              onClick={() => fileInput.current?.click()}
              disabled={upload.isPending}
              className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {upload.isPending
                ? "Uploading..."
                : school.logoUrl
                  ? "Replace logo"
                  : "Upload logo"}
            </button>
            <p className="mt-1 text-xs text-gray-500">
              PNG or JPG, up to 2MB. Square works best.
            </p>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

function Text({
  label,
  value,
  onChange,
  ro,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  ro: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-600">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={ro}
        className="mt-1 w-full rounded border p-2 disabled:bg-slate-50 disabled:text-gray-500"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  ro,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  ro: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={ro}
        className="mt-1 w-full rounded border p-2 disabled:bg-slate-50 disabled:text-gray-500"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 rounded bg-slate-50 p-2 font-medium">{value}</p>
    </div>
  );
}
