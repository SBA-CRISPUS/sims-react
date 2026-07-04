import {
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../../firebase";

import type { School } from "../types";

import { SchoolCodeGenerator } from "./SchoolCodeGenerator";
import { SchoolSettingsProvisioner } from "./provisioners/SchoolSettingsProvisioner";
import { AcademicYearProvisioner } from "./provisioners/AcademicYearProvisioner";
import { TermProvisioner } from "./provisioners/TermProvisioner";
import { AcademicLevelProvisioner } from "./provisioners/AcademicLevelProvisioner";
import { DepartmentProvisioner } from "./provisioners/DepartmentProvisioner";

export class SchoolProvisioningService {
  static async provision(school: School) {
    console.log("=================================");
    console.log("SIMS SCHOOL PROVISIONING ENGINE");
    console.log("=================================");

    const schoolCode = await SchoolCodeGenerator.generate();

    console.log("Generated School Code:", schoolCode);

    const schoolRef = doc(db, "schools", schoolCode);

    // 1. Create school document
    await setDoc(schoolRef, {
      schoolCode,
      emisCode: school.emisCode,
      name: school.name,
      schoolType: school.schoolType,
      ownership: school.ownership,
      location: school.location,
      contact: school.contact,
      subscription: school.subscription,
      status: school.status,

      provisioning: {
        status: "in_progress",
        startedAt: serverTimestamp(),
      },

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("✅ School Created");

    // 2. Default settings
    await SchoolSettingsProvisioner.provision(schoolCode);

    // 3. Academic Year
    const academicYearId = await AcademicYearProvisioner.provision(schoolCode);

    // 4. Terms
    await TermProvisioner.provision(schoolCode, academicYearId);

    // 5. Academic Levels
    await AcademicLevelProvisioner.provision(schoolCode);

    // 6. Departments
    await DepartmentProvisioner.provision(schoolCode);

    await updateDoc(schoolRef, {
      "provisioning.status": "completed",
      "provisioning.completedAt": serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("✅ School Provisioning Completed");

    return {
      ...school,
      schoolCode,
      provisioning: {
        status: "completed",
      },
    };
  }
}
