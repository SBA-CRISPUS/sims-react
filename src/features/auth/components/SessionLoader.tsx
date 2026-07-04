import { useAuth } from "../hooks/useAuth";

export default function SessionLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
          <p className="text-gray-600">Loading SIMS...</p>
        </div>
      </div>
    );
  }

  return children;
}
