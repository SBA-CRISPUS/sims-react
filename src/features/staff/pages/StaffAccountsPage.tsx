import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  useSchoolUsers,
  useCreateStaffAccount,
  useSetUserActive,
} from "../hooks/staffQueries";
import type {
  CreateStaffAccountResult,
  StaffRole,
} from "../../../domain/identity/IdentityManagementService";

const ROLE_LABEL: Record<string, string> = {
  school_admin: "School Administrator",
  head_teacher: "Head Teacher",
  deputy_head: "Deputy Head",
  hod: "Head of Department",
  teacher: "Teacher",
};

const CREATABLE_ROLES: { value: StaffRole; label: string }[] = [
  { value: "head_teacher", label: "Head Teacher" },
  { value: "deputy_head", label: "Deputy Head" },
  { value: "hod", label: "Head of Department" },
  { value: "school_admin", label: "School Administrator" },
];

/**
 * The school's login accounts: list, provision leadership accounts
 * (server-side, temp password shown ONCE), deactivate/reactivate.
 * Teacher logins stay on the teacher's profile (they bind to the HR
 * record's employeeNumber).
 */
export default function StaffAccountsPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;

  const users = useSchoolUsers(schoolCode);
  const create = useCreateStaffAccount(schoolCode ?? "");
  const setActive = useSetUserActive(schoolCode ?? "");

  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("head_teacher");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateStaffAccountResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolCode) return;
    setError(null);
    try {
      const result = await create.mutateAsync({
        schoolCode,
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        role,
      });
      setCreated(result);
      setShowForm(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not create the account."
      );
    }
  }

  async function copyCredentials() {
    if (!created) return;
    await navigator.clipboard.writeText(
      `Email: ${created.user.email}\nTemporary password: ${created.credentials.temporaryPassword}`
    );
    setCopied(true);
  }

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Staff Accounts</h1>
          <p className="mt-1 text-gray-600">
            {school?.name} · login accounts and their status
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setCreated(null);
            }}
            className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
          >
            + Create staff account
          </button>
        )}
      </div>

      <p className="mt-2 text-sm text-gray-500">
        Teacher logins are created from the teacher's own profile
        (<Link to="/teachers/registry" className="text-blue-700 hover:underline">
          Teachers
        </Link>{" "}
        → profile → Create login account), so they stay linked to the HR
        record.
      </p>

      {created && (
        <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4">
          <p className="font-medium text-green-900">
            Account created for {created.user.displayName} (
            {ROLE_LABEL[created.user.role] ?? created.user.role})
          </p>
          <p className="mt-1 text-sm text-green-800">
            Share these credentials now — the temporary password is shown{" "}
            <strong>only once</strong>. They must change it at first sign-in.
          </p>
          <div className="mt-3 rounded border border-green-200 bg-white p-3 font-mono text-sm">
            <div>Email: {created.user.email}</div>
            <div>Temporary password: {created.credentials.temporaryPassword}</div>
          </div>
          <div className="mt-3 flex gap-3">
            <button
              onClick={copyCredentials}
              className="rounded bg-green-700 px-4 py-1.5 text-sm text-white hover:bg-green-800"
            >
              {copied ? "Copied ✓" : "Copy credentials"}
            </button>
            <button
              onClick={() => setCreated(null)}
              className="rounded border border-green-400 px-4 py-1.5 text-sm text-green-800 hover:bg-green-100"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={submit}
          className="mt-4 rounded-lg border bg-slate-50 p-4"
        >
          <p className="font-medium">New leadership account</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-sm text-gray-600">First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">
                Phone (optional)
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                className="mt-1 w-full rounded border p-2"
              >
                {CREATABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={create.isPending || !firstName || !lastName || !email}
              className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {create.isPending ? "Creating..." : "Create account"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 rounded-lg bg-white shadow">
        {users.isLoading ? (
          <p className="p-6 text-gray-500">Loading accounts...</p>
        ) : (users.data ?? []).length === 0 ? (
          <p className="p-6 text-gray-500">No accounts yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-gray-500">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Teacher No.</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {(users.data ?? []).map((u) => {
                const isSelf = u.uid === profile?.uid;
                return (
                  <tr key={u.uid} className="border-b">
                    <td className="p-3">
                      {u.displayName}
                      {isSelf && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td className="p-3 font-mono text-xs">
                      {u.employeeNumber ?? "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          u.active
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {u.active ? "active" : "deactivated"}
                        {u.active && u.mustChangePassword ? " · temp password" : ""}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {!isSelf && u.role !== "super_admin" && (
                        <button
                          onClick={() =>
                            setActive.mutate({ uid: u.uid, active: !u.active })
                          }
                          disabled={setActive.isPending}
                          className={`rounded border px-3 py-1 text-xs disabled:opacity-50 ${
                            u.active
                              ? "border-red-300 text-red-700 hover:bg-red-50"
                              : "border-green-400 text-green-700 hover:bg-green-50"
                          }`}
                        >
                          {u.active ? "Deactivate" : "Reactivate"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="p-3 text-xs text-gray-500">
          Deactivating an account disables its sign-in and revokes its
          sessions within about an hour. Accounts are never deleted — the
          audit history stays attributable.
        </p>
      </div>
    </div>
  );
}
