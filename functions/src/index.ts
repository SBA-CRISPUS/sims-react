/**
 * SIMS Cloud Functions entry point.
 *
 * Each feature area lives in its own folder, mirroring the React
 * application's feature structure:
 *
 *   identity/  - user provisioning and identity management
 *   schools/   - school-level server operations
 *   students/  - student module operations
 *   teachers/  - teacher module operations
 *   reports/   - reporting and aggregation
 */
export { createSchoolAdministrator } from "./identity/createSchoolAdministrator";
export { syncMyClaims } from "./identity/syncMyClaims";
export { onStudentAdmitted } from "./students/onStudentAdmitted";
export { onEnrollmentWritten } from "./academic/onEnrollmentWritten";
