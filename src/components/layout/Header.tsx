import { AuthService } from "../../features/auth/services/AuthService";
import { useAuth } from "../../features/auth/hooks/useAuth";

export default function Header() {
  const { profile, school } = useAuth();

  async function handleSignOut() {
    await AuthService.logout();
  }

  return (
    <header className="h-16 bg-blue-700 flex items-center justify-between px-6 text-white shadow">

      <div>
        <h1 className="text-xl font-bold">
          School Information Management System
        </h1>
        {school && (
          <p className="text-xs text-blue-100">
            {school.name}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm">
          {profile ? profile.displayName : "Not Signed In"}
        </span>

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
