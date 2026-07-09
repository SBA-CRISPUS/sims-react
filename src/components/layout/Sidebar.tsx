import { Link } from "react-router-dom";
import { navigation } from "../../config/navigation";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useActionCounts } from "../../features/notifications/useActionCounts";
import { AuthService } from "../../features/auth/services/AuthService";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { profile, school } = useAuth();
  const counts = useActionCounts();

  const userRole = profile?.role;

  const visibleItems = navigation.filter(
    (item) =>
      userRole !== undefined &&
      item.roles.includes(userRole) &&
      !(item.hideForGovernment && school?.ownership === "Government")
  );

  return (
    <>
      {/* Mobile Overlay Background - dims the screen behind the sidebar */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white min-h-screen
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          flex flex-col
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {visibleItems.map((item, i) => {
            const count = counts[item.path] ?? 0;
            // Items keep their config order; a small heading is emitted
            // whenever the group changes (ungrouped items sit at the top).
            const showHeader =
              !!item.group && item.group !== visibleItems[i - 1]?.group;
            return (
              <div key={item.path}>
                {showHeader && (
                  <p className="mb-1 mt-4 border-t border-slate-800 px-3 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {item.group}
                  </p>
                )}
                <Link
                  to={item.path}
                  onClick={onClose} // Close sidebar on mobile when a link is clicked
                  className="flex items-center justify-between rounded px-3 py-2 hover:bg-slate-700"
                >
                  <span>{item.title}</span>
                  {count > 0 && (
                    <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold">
                      {count}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Account section - the only path to these on mobile, where the
            header hides them to save space. */}
        {profile && (
          <div className="shrink-0 space-y-1 border-t border-slate-700 p-4">
            <Link
              to="/account/password"
              onClick={onClose}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Change password
            </Link>
            <button
              onClick={() => AuthService.logout()}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
