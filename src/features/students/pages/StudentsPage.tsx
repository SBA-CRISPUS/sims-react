import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  useStudents,
  useEnrollments,
  currentEnrollment,
} from "../hooks/studentQueries";
import type { StudentRow } from "../hooks/studentQueries";
import { fullName } from "../format";
import { exportStudentsCsv } from "../export";
import StudentFilters from "../components/StudentFilters";
import StudentTable from "../components/StudentTable";

const PAGE_SIZE = 20;

export default function StudentsPage() {
  const { school } = useAuth();
  const schoolCode = school?.schoolCode;

  const studentsQuery = useStudents(schoolCode);
  const enrollmentsQuery = useEnrollments(schoolCode);

  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [stream, setStream] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);

  // Join each student to their current enrollment.
  const rows = useMemo<StudentRow[]>(() => {
    const students = studentsQuery.data ?? [];
    const enrollments = enrollmentsQuery.data ?? [];

    const byStudent = new Map<string, typeof enrollments>();
    for (const e of enrollments) {
      const list = byStudent.get(e.studentId) ?? [];
      list.push(e);
      byStudent.set(e.studentId, list);
    }

    return students
      .map((student) => ({
        student,
        enrollment: currentEnrollment(byStudent.get(student.studentNumber) ?? []),
      }))
      .sort((a, b) =>
        a.student.studentNumber.localeCompare(b.student.studentNumber)
      );
  }, [studentsQuery.data, enrollmentsQuery.data]);

  const levelOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.enrollment?.academicLevelCode).filter(Boolean))]
        .sort() as string[],
    [rows]
  );

  const streamOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.enrollment?.streamId).filter(Boolean))]
        .sort() as string[],
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (level && row.enrollment?.academicLevelCode !== level) return false;
      if (stream && row.enrollment?.streamId !== stream) return false;
      if (status && row.student.status !== status) return false;
      if (q) {
        const haystack = [
          row.student.studentNumber,
          row.student.admissionNumber,
          fullName(row.student),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, level, stream, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  function resetPage<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(0);
    };
  }

  const isLoading = studentsQuery.isLoading || enrollmentsQuery.isLoading;
  const isError = studentsQuery.isError || enrollmentsQuery.isError;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          {school && <p className="mt-1 text-gray-600">{school.name}</p>}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => exportStudentsCsv(filtered)}
            disabled={filtered.length === 0}
            className="rounded border border-slate-300 px-4 py-2 hover:bg-slate-50 disabled:opacity-40"
          >
            Export CSV
          </button>
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
          search={search}
          onSearch={resetPage(setSearch)}
          level={level}
          onLevel={resetPage(setLevel)}
          stream={stream}
          onStream={resetPage(setStream)}
          status={status}
          onStatus={resetPage(setStatus)}
          levelOptions={levelOptions}
          streamOptions={streamOptions}
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
