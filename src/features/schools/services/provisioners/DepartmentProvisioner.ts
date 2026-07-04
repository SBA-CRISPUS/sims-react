import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../../../firebase";

const departments = [
  "Languages",
  "Mathematics",
  "Sciences",
  "Commercial",
  "Practical",
  "Arts",
];

export class DepartmentProvisioner {

  static async provision(
    schoolCode: string
  ) {

    const ref = collection(
      db,
      "schools",
      schoolCode,
      "departments"
    );

    const batch = writeBatch(db);

    for (const department of departments) {

      batch.set(
        doc(ref),
        {
          name: department,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

    }

    await batch.commit();

    console.log("✅ Departments Created");

  }

}