import type { TabProps } from "./TabProps";
import { formatDate } from "../../format";

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}

export default function ProfileTab({ student }: TabProps) {
  const flags = [
    student.cbc?.specialNeeds ? "Special needs" : null,
    student.cbc?.boarding ? "Boarding" : null,
    student.cbc?.transport ? "Transport" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
      <Field label="Admission Number" value={student.admissionNumber} />
      <Field label="Admission ID" value={student.admissionId} />
      <Field label="EMIS Number" value={student.emisNumber} />
      <Field label="Examination Number" value={student.examinationNumber} />
      <Field label="Gender" value={student.gender} />
      <Field label="Date of Birth" value={formatDate(student.dateOfBirth)} />
      <Field label="Nationality" value={student.nationality} />
      <Field label="CBC Pathway" value={student.cbc?.pathway} />
      <Field label="CBC Flags" value={flags} />
    </div>
  );
}
