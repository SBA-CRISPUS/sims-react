import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
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
}
