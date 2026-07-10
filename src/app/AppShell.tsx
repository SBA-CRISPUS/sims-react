import SessionLoader from "../components/common/SessionLoader";
import ProtectedRoute from "../features/auth/components/ProtectedRoute";
import RoleGuard from "../features/auth/components/RoleGuard";
import PasswordGate from "../features/auth/components/PasswordGate";
import SuspensionGate from "../features/auth/components/SuspensionGate";
import AppLayout from "../layouts/AppLayout";

import type { UserRole } from "../features/auth/types/UserProfile";

interface Props {
  roles?: UserRole[];
  children: React.ReactNode;
}

export default function AppShell({ roles, children }: Props) {
  const page = <AppLayout>{children}</AppLayout>;

  return (
    <SessionLoader>
      <ProtectedRoute>
        <SuspensionGate>
          <PasswordGate>
            {roles ? <RoleGuard roles={roles}>{page}</RoleGuard> : page}
          </PasswordGate>
        </SuspensionGate>
      </ProtectedRoute>
    </SessionLoader>
  );
}
