import { SchoolProvisioningService } from "../../features/schools/services/SchoolProvisioningService";
import { IdentityManagementService } from "../identity/IdentityManagementService";

import type { CreateAdministratorResult } from "../identity/IdentityManagementService";
import type { School } from "../../features/schools/types";

export interface AdministratorDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface SchoolOnboardingRequest {
  school: School;
  administrator: AdministratorDetails;
}

/**
 * The welcome package: everything the super administrator hands over
 * to a newly onboarded school. Credentials are shown exactly once and
 * are not recoverable afterwards.
 */
export interface SchoolOnboardingResult {
  schoolCode: string;
  schoolName: string;
  administrator: CreateAdministratorResult["user"];
  credentials: CreateAdministratorResult["credentials"];
}

export class SchoolOnboardingService {
  static async onboard(
    request: SchoolOnboardingRequest
  ): Promise<SchoolOnboardingResult> {
    const school = await SchoolProvisioningService.provision(request.school);

    const administrator =
      await IdentityManagementService.createSchoolAdministrator({
        schoolCode: school.schoolCode,
        firstName: request.administrator.firstName,
        lastName: request.administrator.lastName,
        email: request.administrator.email,
        phone: request.administrator.phone,
      });

    return {
      schoolCode: school.schoolCode,
      schoolName: school.name,
      administrator: administrator.user,
      credentials: administrator.credentials,
    };
  }
}
