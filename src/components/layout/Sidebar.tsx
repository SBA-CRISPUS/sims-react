import { Link } from "react-router-dom";
import { navigation } from "../../config/navigation";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useActionCounts } from "../../features/notifications/useActionCounts";

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
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <nav className="p-4 space-y-2 overflow-y-auto h-full pb-20">
          {visibleItems.map((item) => {
            const count = counts[item.path] ?? 0;
            return (
              <Link
                key={item.path}
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
            );
          })}
        </nav>
      </aside>
    </>
  );
}