import { doc, getDoc } from "firebase/firestore";

import { db } from "../../../firebase";

import type { UserProfile } from "../types/UserProfile";

export class UserProfileService {
  static async getProfile(uid: string): Promise<UserProfile | null> {
    const snapshot = await getDoc(doc(db, "users", uid));

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as UserProfile;
  }
}
