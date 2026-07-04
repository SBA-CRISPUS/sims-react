import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import type { Path } from "react-hook-form";
import { Link } from "react-router-dom";

import { StudentAdmissionService } from "../../../domain/students/StudentAdmissionService";
import type { StudentAdmissionRequest } from "../../../domain/students/StudentAdmissionRequest";

import type { AdmissionFormValues } from "./AdmissionFormValues";
import PersonalStep from "./PersonalStep";
import GuardianStep from "./GuardianStep";
import PlacementStep from "./PlacementStep";
import MedicalStep from "./MedicalStep";
import ReviewStep from "./ReviewStep";

const STEPS = [
  { title: "Personal", element: <PersonalStep /> },
  { title: "Guardian", element: <GuardianStep /> },
  { title: "Placement", element: <PlacementStep /> },
  { title: "Medical", element: <MedicalStep /> },
  { title: "Review", element: <ReviewStep /> },
];

// Fields validated before leaving each step.
const STEP_FIELDS: Path<AdmissionFormValues>[][] = [
  [
    "student.firstName",
    "student.lastName",
    "student.dateOfBirth",
    "student.nationality",
    "student.admissionNumber",
  ],
  ["guardian.firstName", "guardian.lastName", "guardian.phone"],
  [
    "enrollment.academicYearId",
    "enrollment.streamId",
    "enrollment.admissionDate",
  ],
  [],
  [],
];

const today = new Date().toISOString().slice(0, 10);
const currentYear = new Date().getFullYear();

export default function AdmissionWizard() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const methods = useForm<AdmissionFormValues>({
    defaultValues: {
      student: {
        admissionNumber: "",
        firstName: "",
        lastName: "",
        gender: "Male",
        dateOfBirth: "",
        nationality: "Zambian",
        cbc: {
          specialNeeds: false,
          boarding: false,
          transport: false,
        },
      },
      guardian: {
        firstName: "",
        lastName: "",
        relationship: "Guardian",
        phone: "",
      },
      enrollment: {
        academicYearId: `AY-${currentYear}`,
        academicLevelCode: "F1",
        streamId: "",
        admissionDate: today,
      },
    },
  });

  const isLastStep = step === STEPS.length - 1;

  async function next() {
    const valid = await methods.trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(values: AdmissionFormValues) {
    const request: StudentAdmissionRequest = {
      student: {
        ...values.student,
        dateOfBirth: new Date(values.student.dateOfBirth),
      },
      guardian: { ...values.guardian },
      enrollment: {
        ...values.enrollment,
        admissionDate: new Date(values.enrollment.admissionDate),
        status: "active",
      },
    };

    await StudentAdmissionService.admit(request);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto p-8">
        <div className="rounded-lg bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-green-700">
            Admission Captured
          </h1>
          <p className="mt-4 text-gray-600">
            The admission workflow ran end to end. Persisting the student,
            guardian, and enrollment to Firestore is the next sprint - for now
            the assembled request is logged to the browser console.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                methods.reset();
                setStep(0);
                setSubmitted(false);
              }}
              className="rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800"
            >
              Admit Another
            </button>
            <Link
              to="/students"
              className="rounded border border-slate-300 px-5 py-2 hover:bg-slate-50"
            >
              Back to Students
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Admit Student</h1>

      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                i === step
                  ? "bg-blue-700 text-white"
                  : i < step
                    ? "bg-blue-200 text-blue-800"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={
                i === step ? "font-medium" : "text-slate-500 hidden sm:inline"
              }
            >
              {s.title}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 text-slate-300">—</span>
            )}
          </li>
        ))}
      </ol>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div className="rounded-lg bg-white p-6 shadow">
            {STEPS[step].element}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="rounded border border-slate-300 px-5 py-2 disabled:opacity-40"
            >
              Back
            </button>

            {isLastStep ? (
              <button
                type="submit"
                disabled={methods.formState.isSubmitting}
                className="rounded bg-green-700 px-5 py-2 text-white hover:bg-green-800 disabled:opacity-50"
              >
                {methods.formState.isSubmitting ? "Submitting..." : "Submit Admission"}
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="rounded bg-blue-700 px-5 py-2 text-white hover:bg-blue-800"
              >
                Next
              </button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
