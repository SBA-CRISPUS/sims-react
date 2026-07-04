import { httpsCallable } from "firebase/functions";

import { functions } from "../../firebase";

export interface CreateAdministratorRequest {
  schoolCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export class IdentityManagementService {
  static async createSchoolAdministrator(
    request: CreateAdministratorRequest
  ) {
    const callable = httpsCallable(
      functions,
      "createSchoolAdministrator"
    );

    const result = await callable(request);

    return result.data;
  }
}
