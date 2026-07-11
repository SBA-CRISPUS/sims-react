import {
  collection,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";
import type { QueryConstraint } from "firebase/firestore";

import { db } from "../firebase";

/**
 * Aggregate COUNT query: Firestore charges 1 read per 1,000 index
 * entries counted, versus 1 read PER DOCUMENT for a normal query.
 * Use this whenever a screen needs only "how many" (dashboard tiles,
 * caps, badges) - a 1,000-student school's count costs 1 read instead
 * of 1,000. See docs/READ_BUDGET.md.
 */
export async function countDocs(
  path: string[],
  ...constraints: QueryConstraint[]
): Promise<number> {
  const [first, ...rest] = path;
  const snapshot = await getCountFromServer(
    query(collection(db, first, ...rest), ...constraints)
  );
  return snapshot.data().count;
}

/** Active students in a school - the dashboard/cap count. */
export function countActiveStudents(schoolCode: string): Promise<number> {
  return countDocs(
    ["schools", schoolCode, "students"],
    where("status", "==", "active")
  );
}

/** Active teachers in a school. */
export function countActiveTeachers(schoolCode: string): Promise<number> {
  return countDocs(
    ["schools", schoolCode, "teachers"],
    where("status", "==", "active")
  );
}
