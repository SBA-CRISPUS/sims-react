import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../../../../firebase";

export class AcademicYearProvisioner {

  static async provision(schoolCode: string) {

    const year = new Date().getFullYear();

    const academicYearId = `AY-${year}`;

    const academicYearRef = doc(
      db,
      "schools",
      schoolCode,
      "academicYears",
      academicYearId
    );

    await setDoc(academicYearRef, {

      academicYearId,

      name: `${year} Academic Year`,

      year,

      current: true,

      status: "active",

      terms: 3,

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),

    });

    console.log("✅ Academic Year Created");

    return academicYearId;

  }

}