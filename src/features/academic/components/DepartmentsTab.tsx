import { useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  useDepartments,
  useSubjects,
  useCreateDepartment,
  useUpdateDepartment,
} from "../../subjects/hooks/subjectQueries";
import type { Department } from "../../../domain/academic/Department";

/**
 * Department management: the provisioned defaults are just a starting
 * point - the school administrator adds, renames or deactivates
 * departments here. Subjects and teachers reference departments by id,
 * so a rename updates everywhere; deactivating hides a department from
 * pickers without breaking anything that already references it.
 */
export default function DepartmentsTab() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canManage = profile?.role === "school_admin";

  const departments = useDepartments(schoolCode);
  const subjects = useSubjects(schoolCode);
  const create = useCreateDepartment(schoolCode ?? "");
  const update = useUpdateDepartment(schoolCode ?? "");

  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const subjectCount = (id: string) =>
    (subjects.data ?? []).filter((s) => s.departmentId === id).length;

  async function add() {
    setError(null);
    try {
      await create.mutateAsync(newName);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add.");
    }
  }

  if (departments.isLoading)
    return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      {canManage && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New department name (e.g. Social Sciences)"
            className="w-72 rounded border p-2"
          />
          <button
            onClick={add}
            disabled={create.isPending || !newName.trim()}
            className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {create.isPending ? "Adding..." : "Add department"}
          </button>
        </div>
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {(departments.data ?? []).length === 0 ? (
        <p className="text-gray-500">No departments yet.</p>
      ) : (
        <ul className="divide-y">
          {(departments.data ?? []).map((d) => (
            <DepartmentRow
              key={d.id}
              department={d}
              subjectCount={subjectCount(d.id)}
              canManage={canManage}
              busy={update.isPending}
              onRename={(name) =>
                update.mutateAsync({ departmentId: d.id, patch: { name } })
              }
              onToggle={() =>
                update.mutate({
                  departmentId: d.id,
                  patch: { active: !d.active },
                })
              }
            />
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-gray-500">
        Departments group subjects and teachers. Renaming updates everywhere
        immediately; deactivating hides a department from pickers without
        affecting subjects or teachers already assigned to it.
      </p>
    </div>
  );
}

function DepartmentRow({
  department,
  subjectCount,
  canManage,
  busy,
  onRename,
  onToggle,
}: {
  department: Department;
  subjectCount: number;
  canManage: boolean;
  busy: boolean;
  onRename: (name: string) => Promise<unknown>;
  onToggle: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(department.name);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      await onRename(name);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename.");
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-64 rounded border p-1.5"
          />
          <button
            onClick={save}
            disabled={busy || !name.trim()}
            className="text-sm text-blue-700 hover:underline disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setName(department.name);
              setError(null);
            }}
            className="text-sm text-gray-500 hover:underline"
          >
            Cancel
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      ) : (
        <span className="font-medium">
          {department.name}
          {!department.active && (
            <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              inactive
            </span>
          )}
          <span className="ml-2 text-xs font-normal text-gray-400">
            {subjectCount} subject{subjectCount === 1 ? "" : "s"}
          </span>
        </span>
      )}

      {canManage && !editing && (
        <span className="flex gap-3 text-sm">
          <button
            onClick={() => setEditing(true)}
            className="text-blue-700 hover:underline"
          >
            Rename
          </button>
          <button
            onClick={onToggle}
            disabled={busy}
            className="text-gray-500 hover:underline disabled:opacity-50"
          >
            {department.active ? "Deactivate" : "Reactivate"}
          </button>
        </span>
      )}
    </li>
  );
}
