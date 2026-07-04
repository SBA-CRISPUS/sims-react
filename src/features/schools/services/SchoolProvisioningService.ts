import {doc, serverTimestamp, setDoc,} from "firebase/firestore";
import { db } from "../../../firebase";
import type { School } from "../types";
import { SchoolCodeGenerator } from "./SchoolCodeGenerator";
import { SchoolSettingsProvisioner }
from "./provisioners/SchoolSettingsProvisioner";
import { AcademicYearProvisioner } from "./provisioners/AcademicYearProvisioner";
import { TermProvisioner }
from "./provisioners/TermProvisioner";

export class SchoolProvisioningService {
  static async provision(school: School) {
    console.log("=================================");
    console.log("SIMS SCHOOL PROVISIONING ENGINE");
    console.log("=================================");

    const schoolCode = await SchoolCodeGenerator.generate();

    console.log("Generated School Code:", schoolCode);
   const schoolRef = doc(
  db,
  "schools",
  schoolCode
);

await SchoolSettingsProvisioner.provision(schoolCode);

const academicYearId =
  await AcademicYearProvisioner.provision(
    schoolCode
  );

await TermProvisioner.provision(
  schoolCode,
  academicYearId
);



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
    await SchoolSettingsProvisioner.provision(schoolCode);
    console.log("Creating Academic Year...");
    console.log("Creating Terms...");
    console.log("Creating Streams...");
    console.log("Creating Departments...");
    console.log("Creating Roles...");
    console.log("Creating Administrator...");
    console.log("Creating Audit Log...");
    console.log("Provisioning Completed.");

    return {
      ...school,
      schoolCode,
      provisioning: {
        status: "completed",
      },
    };
  }
}