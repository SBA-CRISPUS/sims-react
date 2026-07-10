import { AuthService } from "../services/AuthService";
import { useAuth } from "../hooks/useAuth";
import { useSchool } from "../../schools/hooks/schoolQueries";

/**
 * Locks a suspended school's users out (subscription enforcement).
 * Reads the school FRESH so a suspension flipped on the platform
 * console takes effect at the user's next page load, not their next
 * login. The system administrator is never gated (they fix billing);
 * users with no school (super_admin) pass through.
 */
export default function SuspensionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, school } = useAuth();
  const isPlatformAdmin = profile?.role === "super_admin";
  const fresh = useSchool(
    !isPlatformAdmin && school ? school.schoolCode : undefined
  );

  const status = fresh.data?.status ?? school?.status;

  if (isPlatformAdmin || !school || status !== "suspended") {
    return children;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow">
        <p className="text-4xl">⏸</p>
        <h1 className="mt-3 text-xl font-bold">
          {school.name} is currently suspended
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Access to SIMS has been paused for your school — usually a
          subscription matter. Your data is safe and nothing has been
          deleted. Please ask your School Administrator to contact the SIMS
          provider to restore access.
        </p>
        <button
          onClick={() => AuthService.logout()}
          className="mt-6 rounded border border-slate-300 px-5 py-2 text-sm hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
