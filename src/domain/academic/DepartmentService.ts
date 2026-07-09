import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../firebase";

import type { Department } from "./Department";

/**
 * Departments are per-school and fully editable: provisioning seeds a
 * default set (Languages, Mathematics, Sciences, Commercial, Practical,
 * Arts) as a starting point, and the school administrator adds, renames
 * or deactivates them here. Subjects and teachers reference departments
 * by id, so a rename flows through everywhere; deactivating hides a
 * department from pickers without touching historical references.
 */
export class DepartmentService {
  static async listDepartments(schoolCode: string): Promise<Department[]> {
    const snapshot = await getDocs(
      collection(db, "schools", schoolCode, "departments")
    );
    return snapshot.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Department, "id">) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  static async createDepartment(
    schoolCode: string,
    name: string
  ): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Department name is required.");
    const existing = await this.listDepartments(schoolCode);
    if (existing.some((d) => d.name.toLowerCase() === trimmed.toLowerCase()))
      throw new Error(`Department "${trimmed}" already exists.`);
    await addDoc(collection(db, "schools", schoolCode, "departments"), {
      name: trimmed,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  static async updateDepartment(
    schoolCode: string,
    departmentId: string,
    patch: Partial<Pick<Department, "name" | "active">>
  ): Promise<void> {
    if (patch.name !== undefined && !patch.name.trim())
      throw new Error("Department name is required.");
    await updateDoc(
      doc(db, "schools", schoolCode, "departments", departmentId),
      {
        ...patch,
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        updatedAt: serverTimestamp(),
      }
    );
  }
}
