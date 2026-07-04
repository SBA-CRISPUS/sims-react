import { useAuth } from "../../features/auth/hooks/useAuth";

export default function Header() {
  const { profile, school } = useAuth();

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

      <div className="text-sm">
        {profile ? profile.displayName : "Not Signed In"}
      </div>

    </header>
  );
}
