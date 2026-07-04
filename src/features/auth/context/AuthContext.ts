import { createContext } from "react";

import type { User } from "firebase/auth";

import type { UserProfile } from "../types/UserProfile";
import type { School } from "../../schools/types";

export interface AuthContextType {
  firebaseUser: User | null;
  profile: UserProfile | null;
  school: School | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  profile: null,
  school: null,
  loading: true,
});
