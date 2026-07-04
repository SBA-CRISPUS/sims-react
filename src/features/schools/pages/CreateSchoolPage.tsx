import { SchoolProvisioningService } from "../services/SchoolProvisioningService";
import { useForm } from "react-hook-form";

import type { School } from "../types";
import { defaultSchool } from "../types";

export default function CreateSchoolPage() {
  const {
    register,
    handleSubmit,
    reset,
  } = useForm<School>({
    defaultValues: defaultSchool,
  });

  async function onSubmit(data: School) {
  try {
    const school = await SchoolProvisioningService.provision(data);

    console.log("Provisioned School");

    console.table(school);

    alert("School provisioned successfully!");

    reset();
  } catch (error) {
    console.error(error);

    alert("Provisioning failed.");
  }
}

  return (
    <div className="max-w-3xl mx-auto p-8">

      <h1 className="text-3xl font-bold mb-6">
        Register School
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >

        <div>
          <label className="block font-medium">
            School Name
          </label>

          <input
            {...register("name")}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">
            EMIS Code
          </label>

          <input
            {...register("emisCode")}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">
            Province
          </label>

          <input
            {...register("location.province")}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">
            District
          </label>

          <input
            {...register("location.district")}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">
            Address
          </label>

          <input
            {...register("location.address")}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">
            Phone
          </label>

          <input
            {...register("contact.phone")}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">
            Email
          </label>

          <input
            {...register("contact.email")}
            className="w-full border rounded p-2"
          />
        </div>

        <button
          className="bg-blue-700 text-white px-5 py-2 rounded hover:bg-blue-800"
        >
          Save School
        </button>

      </form>
    </div>
  );
}