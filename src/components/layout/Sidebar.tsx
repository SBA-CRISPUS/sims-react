import { Link } from "react-router-dom";
import { navigation } from "../../config/navigation";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useActionCounts } from "../../features/notifications/useActionCounts";

export default function Sidebar() {
  const { profile } = useAuth();
  const counts = useActionCounts();

  const userRole = profile?.role;

  const visibleItems = navigation.filter(
    (item) => userRole !== undefined && item.roles.includes(userRole)
  );

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen">
      <nav className="p-4 space-y-2">
        {visibleItems.map((item) => {
          const count = counts[item.path] ?? 0;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center justify-between rounded px-3 py-2 hover:bg-slate-700"
            >
              <span>{item.title}</span>
              {count > 0 && (
                <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
