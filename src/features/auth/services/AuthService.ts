import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";

import { auth } from "../../../firebase";

export class AuthService {
  static login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  static logout() {
    return signOut(auth);
  }

  static onAuthChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Changes the signed-in user's password. Always re-authenticates with
   * the current password first - updatePassword requires a recent login,
   * and asking for the current password is the proof-of-possession step
   * anyway (temp-password holders just type the temp password).
   */
  /** Self-service reset: Firebase emails a reset link. With email
   * enumeration protection on, this resolves whether or not the address
   * has an account - the UI shows a neutral message either way. */
  static resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  }

  static async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user?.email) throw new Error("You must be signed in.");
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    );
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  }
}
