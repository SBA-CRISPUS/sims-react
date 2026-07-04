import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../../../firebase";

const academicLevels = [
  {
    code: "F1",
    name: "Form 1",
    order: 1,
    section: "Junior Secondary",
  },
  {
    code: "F2",
    name: "Form 2",
    order: 2,
    section: "Junior Secondary",
  },
  {
    code: "F3",
    name: "Form 3",
    order: 3,
    section: "Senior Secondary",
  },
  {
    code: "F4",
    name: "Form 4",
    order: 4,
    section: "Senior Secondary",
  },
];

export class AcademicLevelProvisioner {

  static async provision(
    schoolCode: string
  ) {

    const ref = collection(
      db,
      "schools",
      schoolCode,
      "academicLevels"
    );

    const batch = writeBatch(db);

    for (const level of academicLevels) {

      batch.set(
        doc(ref, level.code),
        {

          levelCode: level.code,

          name: level.name,

          order: level.order,

          section: level.section,

          active: true,

          createdAt: serverTimestamp(),

          updatedAt: serverTimestamp(),

        }
      );

    }

    await batch.commit();

    console.log("✅ Academic Levels Created");

  }

}