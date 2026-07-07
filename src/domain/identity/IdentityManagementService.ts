import { httpsCallable } from "firebase/functions";

import { functions } from "../../firebase";

export interface CreateAdministratorRequest {
  schoolCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface CreateAdministratorResult {
  user: {
    uid: string;
    displayName: string;
    email: string;
  };
  credentials: {
    temporaryPassword: string;
  };
}

export interface CreateTeacherAccountRequest {
  schoolCode: string;
  employeeNumber: string;
  email?: string;
}

export interface CreateTeacherAccountResult {
  user: {
    uid: string;
    displayName: string;
    email: string;
    employeeNumber: string;
  };
  credentials: {
    temporaryPassword: string;
  };
}

export type StaffRole =
  | "school_admin"
  | "head_teacher"
  | "deputy_head"
  | "hod";

export interface CreateStaffAccountRequest {
  schoolCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: StaffRole;
}

export interface CreateStaffAccountResult {
  user: {
    uid: string;
    displayName: string;
    email: string;
    role: string;
  };
  credentials: {
    temporaryPassword: string;
  };
}

export interface SyncedClaims {
  role: string;
  schoolCode: string;
  employeeNumber?: string;
}

export class IdentityManagementService {
  static async syncMyClaims(): Promise<SyncedClaims> {
    const callable = httpsCallable<void, SyncedClaims>(
      functions,
      "syncMyClaims"
    );

    const result = await callable();

    return result.data;
  }

  static async createSchoolAdministrator(
    request: CreateAdministratorRequest
  ): Promise<CreateAdministratorResult> {
    const callable = httpsCallable<
      CreateAdministratorRequest,
      CreateAdministratorResult
    >(functions, "createSchoolAdministrator");

    const result = await callable(request);

    return result.data;
  }

  static async createTeacherAccount(
    request: CreateTeacherAccountRequest
  ): Promise<CreateTeacherAccountResult> {
    const callable = httpsCallable<
      CreateTeacherAccountRequest,
      CreateTeacherAccountResult
    >(functions, "createTeacherAccount");

    const result = await callable(request);

    return result.data;
  }

  /** Leadership logins (head/deputy/HOD/another admin). Teachers go via
   * createTeacherAccount so the employeeNumber link exists. */
  static async createStaffAccount(
    request: CreateStaffAccountRequest
  ): Promise<CreateStaffAccountResult> {
    const callable = httpsCallable<
      CreateStaffAccountRequest,
      CreateStaffAccountResult
    >(functions, "createStaffAccount");

    const result = await callable(request);

    return result.data;
  }
}
