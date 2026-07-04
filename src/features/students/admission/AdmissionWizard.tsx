import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import type { Path } from "react-hook-form";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { StudentAdmissionService } from "../../../domain/students/StudentAdmissionService";
import type { StudentAdmissionRequest } from "../../../domain/students/StudentAdmissionRequest";
import type { AdmissionResult } from "../../../domain/students/StudentAdmissionService";
import { useAuth } from "../../auth/hooks/useAuth";

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
    "enrollment.academicLevelCode",
    "enrollment.streamId",
    "enrollment.admissionDate",
  ],
  [],
  [],
];

const today = new Date().toISOString().slice(0, 10);
const currentYear = new Date().getFullYear();

export default function AdmissionWizard() {
  const { school, firebaseUser } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [result, setResult] = useState<AdmissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);

    if (!school || !firebaseUser) {
      setError("No active school session. Please sign in again.");
      return;
    }

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

    try {
      const admission = await StudentAdmissionService.admit(
        school.schoolCode,
        firebaseUser.uid,
        request
      );
      // Refresh the registry/dashboard so the new learner appears
      // immediately instead of after the staleTime window.
      queryClient.invalidateQueries({
        queryKey: ["registry", school.schoolCode],
      });
      setResult(admission);
    } catch (err) {
      console.error(err);
      setError(
        "Admission failed. This requires an internet connection - check your connection and try again."
      );
    }
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto p-8">
        <div className="rounded-lg bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-green-700">
            Student Admitted
          </h1>
          <p className="mt-4 text-gray-600">
            The learner, guardian, and enrollment were created together in
            Firestore.
          </p>
          <div className="mt-6 space-y-1">
            <p>
              <span className="font-medium">Student Number:</span>{" "}
              {result.studentNumber}
            </p>
            <p>
              <span className="font-medium">Admission ID:</span>{" "}
              {result.admissionId}
            </p>
            <p>
              <span className="font-medium">Guardian ID:</span>{" "}
              {result.guardianId}
            </p>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                methods.reset();
                setStep(0);
                setResult(null);
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

          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}

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
