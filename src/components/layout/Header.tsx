import { Link } from "react-router-dom";
import { AuthService } from "../../features/auth/services/AuthService";
import { useAuth } from "../../features/auth/hooks/useAuth";
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
    <header className="flex h-16 items-center justify-between border-b border-sand bg-paper-raised px-4 sm:px-6 relative z-20">
      <div className="flex items-center gap-3">
        {/* Hamburger Menu - Visible only on mobile */}
        <button
          onClick={onToggleSidebar}
          className="mr-2 rounded p-1 text-slate-700 hover:bg-slate-100 md:hidden"
          aria-label="Toggle Menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        {school?.logoUrl && (
          <img
            src={school.logoUrl}
            alt=""
            className="h-8 w-8 sm:h-10 sm:w-10 rounded bg-white object-contain p-0.5 ring-1 ring-sand"
          />
        )}
        {school ? (
          <div>
            {/* Truncate text on small screens to prevent overflow */}
            <h1 className="font-display text-lg sm:text-xl font-semibold leading-tight text-slate-900 line-clamp-1">
              {school.name}
            </h1>
            {/* Hide subtitle on mobile */}
            <p className="hidden sm:block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              SIMS · School Information Management System
            </p>
          </div>
        ) : (
          <h1 className="font-display text-lg sm:text-xl font-semibold text-slate-900 line-clamp-1">
            SIMS{" "}
            <span className="hidden sm:inline font-sans text-base font-normal text-slate-500">
              · School Information Management System
            </span>
          </h1>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Hide username on very small screens to save space */}
        <span className="hidden sm:inline-block text-sm text-slate-700">
          {profile ? profile.displayName : "Not Signed In"}
        </span>

        {profile && (
          <Link
            to="/account/password"
            className="hidden md:block text-xs text-slate-500 hover:text-blue-700 hover:underline"
          >
            Change password
          </Link>
        )}

        {profile && (
          <button
            onClick={handleSignOut}
            className="rounded border border-sand px-2 py-1 sm:px-3 text-xs sm:text-sm text-slate-700 hover:border-blue-700 hover:text-blue-700 whitespace-nowrap"
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  );
}
