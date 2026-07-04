import type { School } from "../../features/schools/types";

import { SchoolCodeGenerator } from "./SchoolCodeGenerator";

export class SchoolProvisioningService {

  static async provision(
    school: School
  ) {

    console.log("Starting Provisioning...");

    const schoolCode =
      await SchoolCodeGenerator.generate();

    console.log(
      "Generated School Code:",
      schoolCode
    );

    console.log(
      "Creating School..."
    );

    console.log(
      "Creating Settings..."
    );

    console.log(
      "Creating Academic Year..."
    );

    console.log(
      "Creating Terms..."
    );

    console.log(
      "Creating Streams..."
    );

    console.log(
      "Creating Departments..."
    );

    console.log(
      "Creating Roles..."
    );

    console.log(
      "Creating Administrator..."
    );

    console.log(
      "Creating Audit Log..."
    );

    console.log(
      "Provisioning Completed."
    );

    return {

      ...school,

      schoolCode,

      provisioning: {

        status: "completed",

      },

    };

  }

}