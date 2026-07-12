import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useAcademicContext } from "../../academic/hooks/useAcademicContext";
import {
  useActiveStudentCount,
  useActiveTeacherCount,
} from "../hooks/countQueries";
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

  // Aggregate count queries (1 read each), NOT full collection scans -
  // this is the most-visited page in the app (READ BUDGET).
  const studentCount = useActiveStudentCount(schoolCode);
  const teacherCount = useActiveTeacherCount(schoolCode);
  const submissions = useSbaSubmissions(schoolCode);
  const actions = useActionCounts();

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

  const sbaRatioLabel =
    submissions.isLoading ? "…" : `${pipeline.approved}/${pipeline.total}`;
  const sbaRatioPct =
    pipeline.total > 0 ? (pipeline.approved / pipeline.total) * 100 : 0;

  return (
    <div className="p-6 sm:p-8">
      {/* Bento top: hero + status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        <div className="relative overflow-hidden rounded-3xl bg-surface-deep p-8 text-white shadow-lg">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 65% at 100% 100%, rgba(182,85,42,0.16), transparent 60%)",
            }}
          />
          <div className="relative">
            <p className="text-sm text-slate-300/90">{today}</p>
            <h1 className="mt-1 font-display text-3xl font-medium italic sm:text-4xl">
              {timeGreeting()}, {profile?.displayName?.split(" ")[0] ?? "there"}
            </h1>
            <p className="mt-1 text-slate-200/90">{school?.name}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
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

        <div className="rounded-3xl border border-sand bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            SBA sheets approved
          </p>
          <p className="mt-2 font-display text-3xl font-medium text-slate-900">
            {sbaRatioLabel}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-green-600 transition-[width] duration-300"
              style={{ width: `${sbaRatioPct}%` }}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            {pendingActions > 0
              ? `${pendingActions} action${pendingActions === 1 ? "" : "s"} waiting on you.`
              : "Everything is caught up."}
          </p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
        <Kpi
          label="Active students"
          value={studentCount.isLoading ? "…" : String(studentCount.data ?? 0)}
          to="/students/registry"
        />
        <Kpi
          label="Active teachers"
          value={teacherCount.isLoading ? "…" : String(teacherCount.data ?? 0)}
          to="/teachers/registry"
        />
        <Kpi
          label="SBA sheets approved"
          value={sbaRatioLabel}
          to="/assessments/readiness"
          fill={sbaRatioPct}
        />
        <Kpi
          label="Actions pending"
          value={String(pendingActions)}
          to="/tasks"
          accent={pendingActions > 0}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.1fr]">
        {/* Needs attention */}
        <div className="rounded-3xl border border-sand bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-medium text-slate-900">
              Needs your attention
            </h2>
            <Link to="/tasks" className="text-sm text-blue-700 hover:underline">
              All tasks →
            </Link>
          </div>
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
              <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
                All clear — nothing is waiting on you right now.
              </p>
            )}
          </div>
        </div>

        {/* SBA pipeline */}
        <div className="rounded-3xl border border-sand bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-medium text-slate-900">
              SBA pipeline
            </h2>
            <Link
              to="/assessments/readiness"
              className="text-sm text-blue-700 hover:underline"
            >
              Readiness radar →
            </Link>
          </div>
          {pipeline.total === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-gray-500">
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
                const isApproved = stage.key === "approved";
                return (
                  <div key={stage.key}>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{stage.label}</span>
                      <span className="font-medium text-gray-900 tabular-nums">
                        {count}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full transition-[width] duration-300 ${
                          isApproved ? "bg-green-600" : "bg-blue-700"
                        }`}
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
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Quick to="/students/admit" label="Admit student" icon="＋" primary />
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
  fill,
}: {
  label: string;
  value: string;
  to: string;
  accent?: boolean;
  /** 0-100: only pass this when the value is a real ratio of a known
   * denominator - otherwise the bar decorates rather than measures. */
  fill?: number;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-sand bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div
        className={`font-display text-3xl font-medium tracking-tight tabular-nums ${
          accent ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-gray-500 group-hover:text-gray-700">
        {label}
      </div>
      {fill === undefined ? (
        <div
          className={`mt-3 h-1 w-10 rounded-full ${
            accent ? "bg-red-500" : "bg-blue-700"
          }`}
        />
      ) : (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-green-600 transition-[width] duration-300"
            style={{ width: `${fill}%` }}
          />
        </div>
      )}
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
      className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm hover:bg-amber-100"
    >
      <span className="text-warn-ink">
        <strong>{count}</strong> {label}
      </span>
      <span className="text-amber-700">→</span>
    </Link>
  );
}

function Quick({
  to,
  label,
  icon,
  primary,
}: {
  to: string;
  label: string;
  icon: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`rounded-xl border p-4 text-center shadow-sm transition hover:shadow ${
        primary
          ? "border-blue-700 bg-blue-700 hover:bg-blue-800"
          : "border-sand bg-white hover:border-blue-300"
      }`}
    >
      <div className={`text-xl ${primary ? "text-white" : "text-blue-700"}`}>
        {icon}
      </div>
      <div
        className={`mt-1 text-xs font-medium ${
          primary ? "text-white" : "text-gray-700"
        }`}
      >
        {label}
      </div>
    </Link>
  );
}
