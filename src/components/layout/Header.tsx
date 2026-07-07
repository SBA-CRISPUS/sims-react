import { Link } from "react-router-dom";

import { AuthService } from "../../features/auth/services/AuthService";
import { useAuth } from "../../features/auth/hooks/useAuth";

export default function Header() {
  const { profile, school } = useAuth();

  async function handleSignOut() {
    await AuthService.logout();
  }

  return (
    <header className="h-16 bg-blue-700 flex items-center justify-between px-6 text-white shadow">

      {/* The school is the identity; SIMS is the product. Name on top. */}
      <div>
        {school ? (
          <>
            <h1 className="text-xl font-bold leading-tight">{school.name}</h1>
            <p className="text-xs uppercase tracking-wider text-blue-200">
              SIMS · School Information Management System
            </p>
          </>
        ) : (
          <h1 className="text-xl font-bold">
            SIMS · School Information Management System
          </h1>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm">
          {profile ? profile.displayName : "Not Signed In"}
        </span>

        {profile && (
          <Link
            to="/account/password"
            className="text-xs text-blue-200 hover:text-white hover:underline"
          >
            Change password
          </Link>
        )}

        {profile && (
          <button
            onClick={handleSignOut}
            className="rounded border border-blue-300 px-3 py-1 text-sm hover:bg-blue-800"
          >
            Sign Out
          </button>
        )}
      </div>

    </header>
  );
}
