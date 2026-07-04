import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// ------------------------------------------------------------------
// Firebase Configuration
// Replace with your Firebase config or import from your config file.
// ------------------------------------------------------------------

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedSystem() {
  console.log("=======================================");
  console.log("SIMS SYSTEM MASTER DATA SEED");
  console.log("=======================================\n");

  /*
   * STEP 1
   * Academic Structures
   */

  console.log("Seeding Academic Structures...");

  await setDoc(
    doc(db, "system", "academicStructures", "TERM_3"),
    {
      code: "TERM_3",
      name: "Three Term System",
      periods: 3,
      periodPrefix: "TERM",
      current: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  /*
   * STEP 2
   * Grading Systems
   */

  console.log("Seeding Grading Systems...");

  await setDoc(
    doc(db, "system", "gradingSystems", "ECZ-CBC"),
    {
      code: "ECZ-CBC",
      name: "ECZ Competence Based Curriculum",
      countryCode: "ZM",
      current: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  /*
   * STEP 3
   * Countries
   */

  console.log("Seeding Countries...");

  await setDoc(
    doc(db, "system", "countries", "ZM"),
    {
      code: "ZM",
      name: "Zambia",
      currencyCode: "ZMW",
      timezone: "Africa/Lusaka",
      language: "English",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  /*
   * STEP 4
   * Subscription Plans
   */

  console.log("Seeding Subscription Plans...");

  const plans = [
    {
      id: "Basic",
      annualPrice: 3500,
      maxUsers: 30,
      aiEnabled: false,
    },
    {
      id: "Professional",
      annualPrice: 6000,
      maxUsers: 100,
      aiEnabled: false,
    },
    {
      id: "Enterprise",
      annualPrice: 9500,
      maxUsers: -1,
      aiEnabled: true,
    },
  ];

  for (const plan of plans) {
    await setDoc(
      doc(db, "system", "subscriptionPlans", plan.id),
      {
        ...plan,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );
  }

  /*
   * STEP 5
   * School Types
   */

  console.log("Seeding School Types...");

  const schoolTypes = [
    "Primary",
    "Secondary",
    "Combined",
    "Technical",
  ];

  for (const type of schoolTypes) {
    await setDoc(
      doc(db, "system", "schoolTypes", type),
      {
        code: type.toUpperCase(),
        name: type,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );
  }

  /*
   * Ownership Types
   */

  console.log("Seeding Ownership Types...");

  const ownershipTypes = [
    "Government",
    "Grant Aided",
    "Private",
  ];

  for (const ownership of ownershipTypes) {
    await setDoc(
      doc(db, "system", "ownershipTypes", ownership),
      {
        code: ownership.toUpperCase().replace(/ /g, "_"),
        name: ownership,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );
  }

  console.log("\n=======================================");
  console.log("SYSTEM MASTER DATA SEEDED SUCCESSFULLY");
  console.log("=======================================");
}

seedSystem().catch(console.error);