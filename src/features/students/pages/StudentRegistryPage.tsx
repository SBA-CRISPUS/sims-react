import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useRegistry } from "../hooks/studentQueries";
import { StudentRegistryService } from "../../../domain/students/StudentRegistryService";
import type { RegistryFilter } from "../../../domain/students/StudentRegistryService";
import StudentFilters from "../components/StudentFilters";
import StudentTable from "../components/StudentTable";

const PAGE_SIZE = 20;

const EMPTY_FILTER: RegistryFilter = {
  search: "",
  level: "",
  stream: "",
  status: "",
  gender: "",
  admissionYear: "",
};

export default function StudentRegistryPage() {
  const { school, profile } = useAuth();
  const schoolCode = school?.schoolCode;
  const canManage = ["school_admin", "head_teacher"].includes(
    profile?.role ?? ""
  );

  const { data, isLoading, isError } = useRegistry(schoolCode);

  const [filter, setFilter] = useState<RegistryFilter>(EMPTY_FILTER);
  const [page, setPage] = useState(0);

  const rows = useMemo(() => data ?? [], [data]);
  const options = useMemo(
    () => StudentRegistryService.deriveOptions(rows),
    [rows]
  );
  const filtered = useMemo(
    () => StudentRegistryService.filter(rows, filter),
    [rows, filter]
  );

  function patchFilter(patch: Partial<RegistryFilter>) {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(0);
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Registry</h1>
          {school && <p className="mt-1 text-gray-600">{school.name}</p>}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => StudentRegistryService.exportCsv(filtered)}
            disabled={filtered.length === 0}
            className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-50 disabled:opacity-40"
          >
            Export CSV
          </button>
          {canManage && (
            <Link
              to="/students/import"
              className="rounded border border-blue-700 px-4 py-2 text-blue-700 hover:bg-blue-50"
            >
              Import CSV
            </Link>
          )}
          <Link
            to="/students/admit"
            className="rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800"
          >
            + Admit Student
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <StudentFilters
          filter={filter}
          onChange={patchFilter}
          options={options}
        />
      </div>

      <div className="mt-6 rounded-lg bg-white shadow">
        {isLoading && <p className="p-6 text-gray-500">Loading students...</p>}
        {isError && (
          <p className="p-6 text-red-600">Failed to load students.</p>
        )}
        {!isLoading && !isError && <StudentTable rows={pageRows} />}
      </div>

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            {filtered.length} student{filtered.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={safePage === 0}
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {safePage + 1} of {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, pageCount - 1))}
              disabled={safePage >= pageCount - 1}
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
