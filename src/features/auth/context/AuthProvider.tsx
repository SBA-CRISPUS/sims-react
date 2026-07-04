import { useEffect, useState } from "react";

import type { User } from "firebase/auth";

import { AuthService } from "../services/AuthService";
import { UserProfileService } from "../services/UserProfileService";
import { SchoolService } from "../../schools/services/SchoolService";

import { AuthContext } from "./AuthContext";

import type { UserProfile } from "../types/UserProfile";
import type { School } from "../../schools/types";

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
      if (firebaseUser) {
        const profile = await UserProfileService.getProfile(firebaseUser.uid);

        setFirebaseUser(firebaseUser);
        setProfile(profile);

        if (profile) {
          const school = await SchoolService.getSchool(profile.schoolCode);
          setSchool(school);
        }
      } else {
        setFirebaseUser(null);
        setProfile(null);
        setSchool(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, school, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
