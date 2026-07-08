import { Link } from "react-router-dom";

import { useAuth } from "../auth/hooks/useAuth";
import { useMyTasks } from "./useMyTasks";
import type { TaskItem } from "./useMyTasks";

const TONE_DOT: Record<TaskItem["tone"], string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  slate: "bg-slate-400",
};

const TONE_CHIP: Record<TaskItem["tone"], string> = {
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-blue-100 text-blue-800",
  slate: "bg-slate-100 text-slate-700",
};

/**
 * The Workflow Hub: one place that answers "what needs my attention
 * today?" for every role - returned sheets for teachers, reviews and
 * transfer decisions for leadership, housekeeping and the ECZ deadline
 * for administrators. Every row deep-links into the module where the
 * work happens.
 */
export default function MyTasksPage() {
  const { profile } = useAuth();
  const { sections, total, loading } = useMyTasks();

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">My Tasks</h1>
          <p className="mt-1 text-gray-600">
            Everything waiting on you
            {profile?.displayName ? `, ${profile.displayName.split(" ")[0]}` : ""}
            — click a task to go straight to it.
          </p>
        </div>
        {!loading && total > 0 && (
          <span className="rounded-full bg-blue-700 px-4 py-1.5 text-sm font-semibold text-white">
            {total} open task{total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading && <p className="mt-6 text-gray-500">Checking your work...</p>}

      {!loading && sections.length === 0 && (
        <div className="mt-6 rounded-2xl bg-green-50 p-8 text-center shadow-sm">
          <p className="text-4xl">✓</p>
          <p className="mt-2 text-lg font-semibold text-green-800">
            All clear — nothing is waiting on you right now.
          </p>
          <p className="mt-1 text-sm text-green-700">
            New score sheets, reviews, transfers and deadlines will appear
            here as they need you.
          </p>
        </div>
      )}

      {!loading &&
        sections.map((section) => (
          <div key={section.title} className="mt-6">
            <h2 className="font-semibold text-gray-800">{section.title}</h2>
            <div className="mt-2 divide-y rounded-lg bg-white shadow">
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[item.tone]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.title}</p>
                    {item.detail && (
                      <p className="text-sm text-gray-500">{item.detail}</p>
                    )}
                  </div>
                  {typeof item.count === "number" && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${TONE_CHIP[item.tone]}`}
                    >
                      {item.count}
                    </span>
                  )}
                  <span className="text-gray-400">→</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
