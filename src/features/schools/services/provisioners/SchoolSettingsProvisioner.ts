import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../../../../firebase";

export class SchoolSettingsProvisioner {

  static async provision(
    schoolCode: string
  ) {

    const settingsRef = doc(
      db,
      "schools",
      schoolCode,
      "settings",
      "default"
    );

    await setDoc(settingsRef, {

      country: "Zambia",

      timezone: "Africa/Lusaka",

      currency: "ZMW",

      language: "English",

      gradingSystem: "ECZ CBC",

      academicStructure: "Term",

      offlineEnabled: true,

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),

    });

    console.log("✅ Settings Created");

  }

}