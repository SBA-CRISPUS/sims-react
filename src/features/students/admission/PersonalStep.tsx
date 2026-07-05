import { useFormContext } from "react-hook-form";

import type { AdmissionFormValues } from "./AdmissionFormValues";

export default function PersonalStep() {
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
            {...register("student.firstName", {
              required: "First name is required",
            })}
            className="w-full border rounded p-2"
          />
          {errors.student?.firstName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.student.firstName.message}
            </p>
          )}
        </div>

        <div>
          <label className="block font-medium">Last Name</label>
          <input
            {...register("student.lastName", {
              required: "Last name is required",
            })}
            className="w-full border rounded p-2"
          />
          {errors.student?.lastName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.student.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block font-medium">Other Names</label>
        <input
          {...register("student.otherNames")}
          className="w-full border rounded p-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">Gender</label>
          <select
            {...register("student.gender")}
            className="w-full border rounded p-2"
          >
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>

        <div>
          <label className="block font-medium">Date of Birth</label>
          <input
            type="date"
            {...register("student.dateOfBirth", {
              required: "Date of birth is required",
            })}
            className="w-full border rounded p-2"
          />
          {errors.student?.dateOfBirth && (
            <p className="mt-1 text-sm text-red-600">
              {errors.student.dateOfBirth.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block font-medium">Nationality</label>
        <input
          {...register("student.nationality", {
            required: "Nationality is required",
          })}
          className="w-full border rounded p-2"
        />
        {errors.student?.nationality && (
          <p className="mt-1 text-sm text-red-600">
            {errors.student.nationality.message}
          </p>
        )}
      </div>

      <div>
        <label className="block font-medium">Examination No.</label>
        <input
          {...register("student.examinationNumber")}
          placeholder="Optional — usually assigned later"
          className="w-full border rounded p-2 sm:w-1/2"
        />
      </div>

      <p className="rounded bg-slate-50 p-3 text-sm text-gray-500">
        The admission number is generated automatically, and the EMIS number is
        taken from the school profile — you don't enter them here.
      </p>
    </div>
  );
}
