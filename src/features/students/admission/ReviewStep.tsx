import { useFormContext } from "react-hook-form";

import type { AdmissionFormValues } from "./AdmissionFormValues";

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}

export default function ReviewStep() {
  const { getValues } = useFormContext<AdmissionFormValues>();
  const { student, guardian, enrollment } = getValues();

  const flags = [
    student.cbc.specialNeeds ? "Special needs" : null,
    student.cbc.boarding ? "Boarding" : null,
    student.cbc.transport ? "Transport" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-semibold border-b pb-1 mb-2">Student</h3>
        <Row
          label="Name"
          value={`${student.firstName} ${student.otherNames ?? ""} ${student.lastName}`}
        />
        <Row label="Gender" value={student.gender} />
        <Row label="Date of Birth" value={student.dateOfBirth} />
        <Row label="Nationality" value={student.nationality} />
        <Row label="Admission No." value={student.admissionNumber} />
      </section>

      <section>
        <h3 className="font-semibold border-b pb-1 mb-2">Guardian</h3>
        <Row
          label="Name"
          value={`${guardian.firstName} ${guardian.lastName}`}
        />
        <Row label="Relationship" value={guardian.relationship} />
        <Row label="Phone" value={guardian.phone} />
      </section>

      <section>
        <h3 className="font-semibold border-b pb-1 mb-2">Placement</h3>
        <Row label="Academic Year" value={enrollment.academicYearId} />
        <Row label="Level" value={enrollment.academicLevelCode} />
        <Row label="Stream" value={enrollment.streamId} />
        <Row label="Admission Date" value={enrollment.admissionDate} />
      </section>

      <section>
        <h3 className="font-semibold border-b pb-1 mb-2">CBC</h3>
        <Row label="Pathway" value={student.cbc.pathway} />
        <Row label="Flags" value={flags} />
      </section>
    </div>
  );
}
