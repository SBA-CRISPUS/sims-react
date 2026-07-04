import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../../firebase";

import type { School } from "../types";

export class SchoolService {
  static async create(school: School) {
    const docRef = await addDoc(
      collection(db, "schools"),
      {
        ...school,

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),
      }
    );

    return docRef.id;
  }
}