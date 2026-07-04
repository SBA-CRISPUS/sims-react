import { doc, getDoc } from "firebase/firestore";

import { db } from "../../../firebase";

import type { School } from "../types";

export class SchoolService {
  static async getSchool(schoolCode: string): Promise<School | null> {
    const snapshot = await getDoc(doc(db, "schools", schoolCode));

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as School;
  }
}
