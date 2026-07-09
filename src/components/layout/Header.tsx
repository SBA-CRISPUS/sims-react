import { Link } from "react-router-dom";
import { AuthService } from "../../features/auth/services/AuthService";
import { useAuth } from "../../features/auth/hooks/useAuth";
// Assuming you have an icon library like lucide-react or heroicons. 
// If not, a simple SVG or text icon works!
import { Menu } from "lucide-react"; 

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { profile, school } = useAuth();

  async function handleSignOut() {
    await AuthService.logout();
  }

  return (
    <header className="h-16 bg-blue-700 flex items-center justify-between px-4 sm:px-6 text-white shadow relative z-20">
      
      <div className="flex items-center gap-3">
        {/* Hamburger Menu - Visible only on mobile */}
        <button 
          onClick={onToggleSidebar}
          className="p-1 mr-2 bg-blue-800 rounded md:hidden hover:bg-blue-600 transition-colors"
          aria-label="Toggle Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {school?.logoUrl && (
          <img
            src={school.logoUrl}
            alt=""
            className="h-8 w-8 sm:h-10 sm:w-10 rounded bg-white object-contain p-0.5"
          />
        )}
        {school ? (
          <div>
            {/* Truncate text on small screens to prevent overflow */}
            <h1 className="text-lg sm:text-xl font-bold leading-tight line-clamp-1">{school.name}</h1>
            {/* Hide subtitle on mobile */}
            <p className="hidden sm:block text-xs uppercase tracking-wider text-blue-200">
              SIMS · School Information Management System
            </p>
          </div>
        ) : (
          <h1 className="text-lg sm:text-xl font-bold line-clamp-1">
            SIMS <span className="hidden sm:inline">· School Information Management System</span>
          </h1>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Hide username on very small screens to save space */}
        <span className="hidden sm:inline-block text-sm">
          {profile ? profile.displayName : "Not Signed In"}
        </span>

        {profile && (
          <Link
            to="/account/password"
            className="hidden md:block text-xs text-blue-200 hover:text-white hover:underline"
          >
            Change password
          </Link>
        )}

        {profile && (
          <button
            onClick={handleSignOut}
            className="rounded border border-blue-300 px-2 py-1 sm:px-3 text-xs sm:text-sm hover:bg-blue-800 whitespace-nowrap"
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  );
}