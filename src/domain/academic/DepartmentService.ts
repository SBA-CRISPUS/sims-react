import { collection, getDocs } from "firebase/firestore";

import { db } from "../../firebase";

import type { Department } from "./Department";

export class DepartmentService {
  static async listDepartments(schoolCode: string): Promise<Department[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "departments")
    );
    return snapshot.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Department, "id">) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
