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

export class IdentityManagementService {
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
}
