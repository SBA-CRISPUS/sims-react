import { useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { useSchool, useUpdateSchool } from "../hooks/schoolQueries";
import type { School } from "../types";
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
