import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

import type { UserRole } from "../types/UserProfile";

interface Props {
  roles: UserRole[];
  children: React.ReactNode;
}

export default function RoleGuard({ roles, children }: Props) {
  const { profile } = useAuth();

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
