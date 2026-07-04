import type { GuardianRelationship } from "../../../domain/students/Guardian";

/**
 * The wizard's working shape. Dates are held as yyyy-mm-dd strings
 * (native date inputs) and converted to Date when the request is
 * assembled on submit.
 */
export interface AdmissionFormValues {
  student: {
    admissionNumber: string;
    emisNumber?: string;
    examinationNumber?: string;
    firstName: string;
    lastName: string;
    otherNames?: string;
    gender: "Male" | "Female";
    dateOfBirth: string;
    nationality: string;
    cbc: {
      pathway?: string;
      specialNeeds: boolean;
      boarding: boolean;
      transport: boolean;
    };
  };
  guardian: {
    firstName: string;
    lastName: string;
    relationship: GuardianRelationship;
    phone: string;
    alternativePhone?: string;
    email?: string;
    address?: string;
  };
  enrollment: {
    academicYearId: string;
    academicLevelCode: string;
    streamId: string;
    admissionDate: string;
  };
}
