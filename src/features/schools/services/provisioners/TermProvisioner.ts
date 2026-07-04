import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../../../firebase";

export class TermProvisioner {

  static async provision(
    schoolCode: string,
    academicYearId: string
  ) {

    const termsRef = collection(
      db,
      "schools",
      schoolCode,
      "academicYears",
      academicYearId,
      "terms"
    );

    const batch = writeBatch(db);

    for (let i = 1; i <= 3; i++) {

      const termRef = doc(
        termsRef,
        `TERM-${i}`
      );

      batch.set(termRef, {

        termId: `TERM-${i}`,

        name: `Term ${i}`,

        order: i,

        current: i === 1,

        locked: false,

        status: "active",

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),

      });

    }

    await batch.commit();

    console.log("✅ Terms Created");

  }

}