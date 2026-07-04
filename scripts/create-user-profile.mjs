/**
 * Creates (or updates) a users/{uid} profile document so a Firebase
 * Authentication account can log into SIMS.
 *
 * Usage:
 *   node scripts/create-user-profile.mjs <uid> <email> <displayName> <role> [schoolCode]
 *
 * If schoolCode is omitted, the first school found in Firestore is used.
 */
import { readFileSync } from "node:fs";

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const [uid, email, displayName, role, schoolCodeArg] = process.argv.slice(2);

if (!uid || !email || !displayName || !role) {
  console.error(
    "Usage: node scripts/create-user-profile.mjs <uid> <email> <displayName> <role> [schoolCode]"
  );
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [
        line.slice(0, i).trim(),
        line.slice(i + 1).trim().replace(/^["']|["']$/g, ""),
      ];
    })
);

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

const schoolsSnapshot = await getDocs(collection(db, "schools"));

const schools = schoolsSnapshot.docs.map((d) => ({
  schoolCode: d.id,
  name: d.data().name,
}));

console.log(`Schools in Firestore: ${schools.length}`);
for (const school of schools) {
  console.log(`  ${school.schoolCode}  ${school.name}`);
}

const schoolCode =
  schoolCodeArg ?? (schools.length > 0 ? schools[0].schoolCode : "SCH-000001");

await setDoc(
  doc(db, "users", uid),
  {
    uid,
    schoolCode,
    displayName,
    email,
    role,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  },
  { merge: true }
);

console.log("");
console.log("User profile created:");
console.log(`  users/${uid}`);
console.log(`  displayName: ${displayName}`);
console.log(`  email:       ${email}`);
console.log(`  role:        ${role}`);
console.log(`  schoolCode:  ${schoolCode}`);
console.log(`  active:      true`);

process.exit(0);
