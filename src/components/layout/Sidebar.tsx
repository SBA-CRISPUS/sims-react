import { Link } from "react-router-dom";
import { navigation } from "../../config/navigation";
import { useAuth } from "../../features/auth/hooks/useAuth";

export default function Sidebar() {
  const { profile } = useAuth();

  const userRole = profile?.role;

  const visibleItems = navigation.filter(
    (item) => userRole !== undefined && item.roles.includes(userRole)
  );

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen">
      <nav className="p-4 space-y-2">
        {visibleItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="block rounded px-3 py-2 hover:bg-slate-700"
          >
            {item.title}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
