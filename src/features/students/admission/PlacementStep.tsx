import { useFormContext } from "react-hook-form";

import type { AdmissionFormValues } from "./AdmissionFormValues";

// Matches the levels created by AcademicLevelProvisioner. When school
// provisioning branches on schoolType, load these from the school's
// academicLevels collection instead of hardcoding.
const ACADEMIC_LEVELS = [
  { code: "F1", name: "Form 1" },
  { code: "F2", name: "Form 2" },
  { code: "F3", name: "Form 3" },
  { code: "F4", name: "Form 4" },
];

export default function PlacementStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<AdmissionFormValues>();

  return (
    <div className="space-y-5">
      <div>
        <label className="block font-medium">Academic Year</label>
        <input
          {...register("enrollment.academicYearId", {
            required: "Academic year is required",
          })}
          className="w-full border rounded p-2"
        />
        {errors.enrollment?.academicYearId && (
          <p className="mt-1 text-sm text-red-600">
            {errors.enrollment.academicYearId.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">Academic Level</label>
          <select
            {...register("enrollment.academicLevelCode")}
            className="w-full border rounded p-2"
          >
            {ACADEMIC_LEVELS.map((level) => (
              <option key={level.code} value={level.code}>
                {level.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Stream</label>
          <input
            {...register("enrollment.streamId", {
              required: "Stream is required",
            })}
            placeholder="e.g. A"
            className="w-full border rounded p-2"
          />
          {errors.enrollment?.streamId && (
            <p className="mt-1 text-sm text-red-600">
              {errors.enrollment.streamId.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block font-medium">Admission Date</label>
        <input
          type="date"
          {...register("enrollment.admissionDate", {
            required: "Admission date is required",
          })}
          className="w-full border rounded p-2"
        />
        {errors.enrollment?.admissionDate && (
          <p className="mt-1 text-sm text-red-600">
            {errors.enrollment.admissionDate.message}
          </p>
        )}
      </div>
    </div>
  );
}
