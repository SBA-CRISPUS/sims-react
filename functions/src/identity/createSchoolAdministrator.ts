import { onCall, HttpsError } from "firebase-functions/v2/https";

export interface CreateAdministratorRequest {
  schoolCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/**
 * Provisions the first administrator account for a school.
 *
 * Planned flow (implemented in the next milestone with the Admin SDK):
 *
 *   Validate Caller
 *     -> Create Firebase Auth User
 *     -> Generate Temporary Password
 *     -> Assign Custom Claims (role, schoolCode)
 *     -> Create users/{uid} Profile
 *     -> Return Result
 */
export const createSchoolAdministrator = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to provision an administrator."
    );
  }

  const data = request.data as CreateAdministratorRequest;

  if (
    !data?.schoolCode ||
    !data?.firstName ||
    !data?.lastName ||
    !data?.email
  ) {
    throw new HttpsError(
      "invalid-argument",
      "schoolCode, firstName, lastName and email are required."
    );
  }

  throw new HttpsError(
    "unimplemented",
    "createSchoolAdministrator is not implemented yet."
  );
});
