import { useEffect, useState } from "react";

import type { User } from "firebase/auth";

import { AuthService } from "../services/AuthService";
import { UserProfileService } from "../services/UserProfileService";
import { SchoolService } from "../../schools/services/SchoolService";
import { IdentityManagementService } from "../../../domain/identity/IdentityManagementService";

import { AuthContext } from "./AuthContext";

import type { UserProfile } from "../types/UserProfile";
import type { School } from "../../schools/types";

/**
 * Firestore rules authorize via custom claims, so a token whose claims
 * drift from the profile (accounts created before claims existed, or a
 * role changed by a super admin) must be re-synced before school-scoped
 * reads will succeed.
 */
async function ensureClaims(firebaseUser: User, profile: UserProfile) {
  const tokenResult = await firebaseUser.getIdTokenResult();

  if (
    tokenResult.claims.role !== profile.role ||
    tokenResult.claims.schoolCode !== profile.schoolCode
  ) {
    await IdentityManagementService.syncMyClaims();
    await firebaseUser.getIdToken(true);
  }
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const profile = await UserProfileService.getProfile(
            firebaseUser.uid
          );

          setFirebaseUser(firebaseUser);
          setProfile(profile);

          if (profile) {
            await ensureClaims(firebaseUser, profile);

            const school = await SchoolService.getSchool(profile.schoolCode);
            setSchool(school);
          } else {
            setSchool(null);
          }
        } else {
          setFirebaseUser(null);
          setProfile(null);
          setSchool(null);
        }
      } catch (error) {
        console.error("Failed to build the session:", error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, school, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
