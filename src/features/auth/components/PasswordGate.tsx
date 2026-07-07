import { useAuth } from "../hooks/useAuth";
import { AuthService } from "../services/AuthService";
import ChangePasswordForm from "./ChangePasswordForm";

/**
 * Sits inside ProtectedRoute, in front of every page:
 *
 * - a DEACTIVATED account is signed out immediately (the Auth account is
 *   also disabled server-side by onUserProfileWritten; this closes the
 *   already-signed-in window client-side);
 * - an account still on its provisioning temp password
 *   (mustChangePassword) must set its own password before it can use the
 *   app - the mentor's "first login forces password change".
 */
export default function PasswordGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, school } = useAuth();

  if (profile && profile.active === false) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow">
          <h1 className="text-xl font-bold">Account deactivated</h1>
          <p className="mt-2 text-sm text-gray-600">
            This account has been deactivated by your school's administrator.
          </p>
          <button
            onClick={() => AuthService.logout()}
            className="mt-6 rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (profile?.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
          <h1 className="text-xl font-bold">
            {school?.name ?? "SIMS"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome, {profile.displayName}. You signed in with a temporary
            password — set your own password to continue.
          </p>
          <div className="mt-6">
            {/* Reload so the session picks up the cleared flag. */}
            <ChangePasswordForm onDone={() => window.location.reload()} />
          </div>
          <button
            onClick={() => AuthService.logout()}
            className="mt-4 w-full text-center text-sm text-gray-500 hover:underline"
          >
            Sign out instead
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
