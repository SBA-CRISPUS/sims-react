import { useFormContext } from "react-hook-form";

import type { AdmissionFormValues } from "./AdmissionFormValues";

export default function GuardianStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<AdmissionFormValues>();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">First Name</label>
          <input
            {...register("guardian.firstName", {
              required: "Guardian first name is required",
            })}
            className="w-full border rounded p-2"
          />
          {errors.guardian?.firstName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.guardian.firstName.message}
            </p>
          )}
        </div>

        <div>
          <label className="block font-medium">Last Name</label>
          <input
            {...register("guardian.lastName", {
              required: "Guardian last name is required",
            })}
            className="w-full border rounded p-2"
          />
          {errors.guardian?.lastName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.guardian.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block font-medium">Relationship</label>
        <select
          {...register("guardian.relationship")}
          className="w-full border rounded p-2"
        >
          <option>Father</option>
          <option>Mother</option>
          <option>Guardian</option>
          <option>Grandparent</option>
          <option>Other</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">Phone</label>
          <input
            {...register("guardian.phone", {
              required: "Guardian phone is required",
            })}
            className="w-full border rounded p-2"
          />
          {errors.guardian?.phone && (
            <p className="mt-1 text-sm text-red-600">
              {errors.guardian.phone.message}
            </p>
          )}
        </div>

        <div>
          <label className="block font-medium">Alternative Phone</label>
          <input
            {...register("guardian.alternativePhone")}
            className="w-full border rounded p-2"
          />
        </div>
      </div>

      <div>
        <label className="block font-medium">Email</label>
        <input
          type="email"
          {...register("guardian.email")}
          className="w-full border rounded p-2"
        />
      </div>

      <div>
        <label className="block font-medium">Address</label>
        <input
          {...register("guardian.address")}
          className="w-full border rounded p-2"
        />
      </div>
    </div>
  );
}
