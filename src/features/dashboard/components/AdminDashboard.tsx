import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import { useRegistry } from "../../students/hooks/studentQueries";
import { useTeachers } from "../../teachers/hooks/teacherQueries";
import { useSbaSubmissions } from "../../assessments/hooks/sbaMarksQueries";
import { useActionCounts } from "../../notifications/useActionCounts";

const PIPELINE: { key: string; label: string }[] = [
  { key: "draft", label: "Entry in progress" },
  { key: "submitted", label: "Awaiting moderation" },
  { key: "moderated", label: "Awaiting approval" },
  { key: "approved", label: "Approved & frozen" },
];

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The school leadership home: a live cockpit of the school - headline
 * numbers, what needs action today, and the SBA pipeline at a glance.
 * Single-hue bars (magnitude only); identity is carried by labels.
 */
export default function AdminDashboard() {
  const { profile, school } = useAuth();
  const schoolCode = school?.schoolCode;
  const { academicYear, term, academicYearId } = useAcademicContext();

  const registry = useRegistry(schoolCode);
  const teachers = useTeachers(schoolCode);
  const submissions = useSbaSubmissions(schoolCode);
  const actions = useActionCounts();

  const learnerCount = useMemo(
    () =>
      (registry.data ?? []).filter((r) => r.student.status === "active").length,
    [registry.data]
  );
  const teacherCount = useMemo(
    () => (teachers.data ?? []).filter((t) => t.status === "active").length,
    [teachers.data]
  );

  const pipeline = useMemo(() => {
    const yearSubs = (submissions.data ?? []).filter(
      (s) => !academicYearId || s.academicYearId === academicYearId
    );
    const counts: Record<string, number> = {};
    for (const s of yearSubs) {
      // returned = back in the teacher's hands; locked = post-approval
      const key =
        s.status === "returned"
          ? "draft"
          : s.status === "locked"
            ? "approved"
            : s.status;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const total = yearSubs.length;
    const approved = counts["approved"] ?? 0;
    return { counts, total, approved };
  }, [submissions.data, academicYearId]);

  const pendingActions =
    (actions["/transfers"] ?? 0) +
    (actions["/assessments/review"] ?? 0) +
    (actions["/assessments/marks"] ?? 0);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const isAdmin = profile?.role === "school_admin";
  const showPayments =
    school?.ownership !== "Government" &&
    ["school_admin", "head_teacher"].includes(profile?.role ?? "");

  const maxBar = Math.max(1, ...PIPELINE.map((p) => pipeline.counts[p.key] ?? 0));

  return (
    <div className="p-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-800 p-8 text-white shadow-lg">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="absolute -bottom-24 right-32 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="relative">
          <p className="text-sm text-blue-200">{today}</p>
          <h1 className="mt-1 text-3xl font-bold">
            {timeGreeting()}, {profile?.displayName?.split(" ")[0] ?? "there"}
          </h1>
          <p className="mt-1 text-blue-100">{school?.name}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {academicYear && (
              <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                {academicYear.name}
              </span>
            )}
            {term && (
              <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                {term.name}
              </span>
            )}
            <span className="rounded-full bg-white/10 px-3 py-1 capitalize backdrop-blur">
              {(profile?.role ?? "").replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Active students"
          value={registry.isLoading ? "…" : String(learnerCount)}
          to="/students/registry"
        />
        <Kpi
          label="Active teachers"
          value={teachers.isLoading ? "…" : String(teacherCount)}
          to="/teachers/registry"
        />
        <Kpi
          label="SBA sheets approved"
          value={
            submissions.isLoading
              ? "…"
              : `${pipeline.approved}/${pipeline.total}`
          }
          to="/assessments/readiness"
        />
        <Kpi
          label="Actions pending"
          value={String(pendingActions)}
          to={pendingActions > 0 ? "/assessments/review" : "/reports"}
          accent={pendingActions > 0}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Needs attention */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-semibold">Needs your attention</h2>
          <div className="mt-3 space-y-2">
            <ActionRow
              count={actions["/transfers"] ?? 0}
              label="transfer requests to decide or respond to"
              to="/transfers"
            />
            <ActionRow
              count={actions["/assessments/review"] ?? 0}
              label="SBA sheets awaiting moderation or approval"
              to="/assessments/review"
            />
            <ActionRow
              count={actions["/assessments/marks"] ?? 0}
              label="returned sheets to correct and resubmit"
              to="/assessments/marks"
            />
            {pendingActions === 0 && (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-gray-500">
                All clear — nothing is waiting on you right now.
              </p>
            )}
          </div>
        </div>

        {/* SBA pipeline */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">SBA pipeline</h2>
            <Link
              to="/assessments/readiness"
              className="text-sm text-blue-700 hover:underline"
            >
              Readiness radar →
            </Link>
          </div>
          {pipeline.total === 0 ? (
            <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-gray-500">
              No SBA sheets for this year yet — start with an{" "}
              <Link
                to="/assessments/plans"
                className="text-blue-700 hover:underline"
              >
                assessment plan
              </Link>
              .
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {PIPELINE.map((stage) => {
                const count = pipeline.counts[stage.key] ?? 0;
                return (
                  <div key={stage.key}>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{stage.label}</span>
                      <span className="font-medium text-gray-900">{count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${(count / maxBar) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Quick to="/students/admit" label="Admit student" icon="＋" />
        <Quick to="/students/registry" label="Registry" icon="▤" />
        <Quick to="/assessments/review" label="SBA Review" icon="✓" />
        <Quick to="/reports" label="Reports" icon="◔" />
        {showPayments && (
          <Quick to="/finance/payments" label="Payments" icon="K" />
        )}
        {isAdmin && <Quick to="/staff" label="Staff Accounts" icon="⚿" />}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  to,
  accent,
}: {
  label: string;
  value: string;
  to: string;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl bg-white p-5 shadow transition hover:shadow-md"
    >
      <div
        className={`text-3xl font-bold tracking-tight ${
          accent ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-gray-500 group-hover:text-gray-700">
        {label}
      </div>
      <div
        className={`mt-3 h-1 w-10 rounded-full ${
          accent ? "bg-red-500" : "bg-blue-600"
        }`}
      />
    </Link>
  );
}

function ActionRow({
  count,
  label,
  to,
}: {
  count: number;
  label: string;
  to: string;
}) {
  if (count === 0) return null;
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm hover:bg-amber-100"
    >
      <span className="text-amber-900">
        <strong>{count}</strong> {label}
      </span>
      <span className="text-amber-700">→</span>
    </Link>
  );
}

function Quick({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-blue-300 hover:shadow"
    >
      <div className="text-xl text-blue-700">{icon}</div>
      <div className="mt-1 text-xs font-medium text-gray-700">{label}</div>
    </Link>
  );
}
