import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../../firebase";
import type { UserProfile } from "../../features/auth/types/UserProfile";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === "function" ? maybe.toDate() : undefined;
}

/**
 * A school administrator's view of the school's login accounts. Reads are
 * rule-scoped (schoolCode equality filter = own school); creation stays
 * with the identity Cloud Functions; the only client write is the
 * active flag (deactivate/reactivate), which onUserProfileWritten turns
 * into a disabled Auth account + revoked tokens.
 */
export class UserAccountService {
  static async listSchoolUsers(schoolCode: string): Promise<UserProfile[]> {
    const snapshot = await getDocs(
      query(collection(db, "users"), where("schoolCode", "==", schoolCode))
    );
    return snapshot.docs
      .map(
        (d) =>
          ({
            ...d.data(),
            createdAt: toDate(d.data().createdAt),
            updatedAt: toDate(d.data().updatedAt),
          }) as unknown as UserProfile
      )
      .sort(
        (a, b) =>
          a.role.localeCompare(b.role) ||
          a.displayName.localeCompare(b.displayName)
      );
  }

  static async setActive(uid: string, active: boolean): Promise<void> {
    await updateDoc(doc(db, "users", uid), {
      active,
      updatedAt: serverTimestamp(),
    });
  }
}
