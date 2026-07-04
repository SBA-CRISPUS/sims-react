import { useFormContext } from "react-hook-form";

import type { AdmissionFormValues } from "./AdmissionFormValues";

export default function MedicalStep() {
  const { register } = useFormContext<AdmissionFormValues>();

  return (
    <div className="space-y-5">
      <div>
        <label className="block font-medium">CBC Pathway</label>
        <input
          {...register("student.cbc.pathway")}
          placeholder="e.g. Sciences, Humanities"
          className="w-full border rounded p-2"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register("student.cbc.specialNeeds")} />
          Special educational needs
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" {...register("student.cbc.boarding")} />
          Boarding
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" {...register("student.cbc.transport")} />
          School transport
        </label>
      </div>

      <p className="text-sm text-gray-500">
        Detailed medical records are captured separately after admission.
      </p>
    </div>
  );
}
