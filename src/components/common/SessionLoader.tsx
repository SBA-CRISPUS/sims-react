import { useAuth } from "../../features/auth/hooks/useAuth";

interface Props {
  children: React.ReactNode;
}

export default function SessionLoader({ children }: Props) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">
            School Information Management System
          </h2>
          <p className="mt-2 text-gray-500">
            Initializing...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
