import type { User } from "firebase/auth";

import type { UserProfile } from "../types/UserProfile";
import type { School } from "../../schools/types";

export interface Session {
  firebaseUser: User;
  profile: UserProfile;
  school: School;
  permissions: string[];
}
