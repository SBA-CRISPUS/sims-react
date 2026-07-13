import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import type { Path } from "react-hook-form";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { StudentAdmissionService } from "../../../domain/students/StudentAdmissionService";
import type { StudentAdmissionRequest } from "../../../domain/students/StudentAdmissionRequest";
import type { AdmissionResult } from "../../../domain/students/StudentAdmissionService";
import { useAuth } from "../../auth/hooks/useAuth";
import { useSubscriptionAccess } from "../../schools/hooks/useSubscriptionAccess";
import { STARTER_STUDENT_LIMIT } from "../../schools/subscription";
import { useActiveStudentCount } from "../../dashboard/hooks/countQueries";

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

  // Subscription posture: read-only blocks admission entirely; the
  // Starter edition caps the school at STARTER_STUDENT_LIMIT students.
  // Aggregate count query (1 read), not a registry scan (READ BUDGET).
  const access = useSubscriptionAccess();
  const studentCount = useActiveStudentCount(school?.schoolCode);
  const activeStudents = studentCount.data ?? 0;
  const starterCapReached =
    access.plan === "Starter" &&
    !studentCount.isLoading &&
    activeStudents >= STARTER_STUDENT_LIMIT;

  const [step, setStep] = useState(0);
  // Furthest step the user has validated through - the stepper lets them
  // jump freely to any step up to here (and back), so they can revisit and
  // correct earlier entries without losing what they typed.
  const [maxReached, setMaxReached] = useState(0);
  // The Review step's explicit commit gate - nothing is written until the
  // user ticks this, so admission is a deliberate confirmation, never an
  // accidental Enter-keypress.
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<AdmissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const methods = useForm<AdmissionFormValues>({
    defaultValues: {
      student: {
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

  function goTo(target: number) {
    setStep(target);
    setMaxReached((m) => Math.max(m, target));
    // Leaving Review invalidates a prior confirmation - if they edit and
    // come back, they must tick the box again.
    if (target !== STEPS.length - 1) setConfirmed(false);
  }

  async function next() {
    const valid = await methods.trigger(STEP_FIELDS[step]);
    if (valid) goTo(Math.min(step + 1, STEPS.length - 1));
  }

  function back() {
    goTo(Math.max(step - 1, 0));
  }

  /**
   * Jump straight to a step from the progress bar. Going back is always
   * allowed (data is preserved); going forward validates each step in
   * between, so you can't skip past incomplete entries.
   */
  async function jumpTo(target: number) {
    if (target === step) return;
    if (target < step) {
      goTo(target);
      return;
    }
    for (let s = step; s < target; s++) {
      const ok = await methods.trigger(STEP_FIELDS[s]);
      if (!ok) {
        setStep(s);
        return;
      }
    }
    goTo(target);
  }

  async function onSubmit(values: AdmissionFormValues) {
    setError(null);

    // The wizard is a single <form>, so pressing Enter on an early step
    // fires submit while only that step's fields are registered - which
    // used to admit immediately, skipping Review. Enter now just advances;
    // the actual write only happens from Review, after explicit confirm.
    if (!isLastStep) {
      await next();
      return;
    }
    if (!confirmed) return;

    if (!school || !firebaseUser) {
      setError("No active school session. Please sign in again.");
      return;
    }

    const request: StudentAdmissionRequest = {
      student: {
        ...values.student,
        dateOfBirth: new Date(values.student.dateOfBirth),
        // EMIS is the school's Ministry code, pulled from the profile.
        emisNumber: school.emisCode || undefined,
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

  if (access.readOnly) {
    return (
      <Notice title="Admissions are paused">
        The school's SIMS subscription has lapsed and the system is in
        read-only mode. Existing records can be viewed, printed and
        exported; new students can be admitted again as soon as the
        subscription is renewed.
      </Notice>
    );
  }

  if (starterCapReached) {
    return (
      <Notice title={`Starter plan limit reached (${STARTER_STUDENT_LIMIT} students)`}>
        Your school has {activeStudents} active students — the Starter
        plan's limit. Upgrade to the Professional plan (unlimited students)
        to continue admitting; ask your School Administrator to contact the
        SIMS provider.
      </Notice>
    );
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto p-8">
        <div className="rounded-lg bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-green-700">
            Student Admitted
          </h1>
          <p className="mt-4 text-gray-600">
            The student, guardian, and enrollment were created successfully.
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
                setMaxReached(0);
                setConfirmed(false);
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
        {STEPS.map((s, i) => {
          const reachable = i <= maxReached;
          return (
            <li key={s.title} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => jumpTo(i)}
                disabled={!reachable}
                aria-current={i === step ? "step" : undefined}
                className={`flex items-center gap-2 rounded ${
                  reachable ? "cursor-pointer" : "cursor-not-allowed"
                }`}
              >
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
              </button>
              {i < STEPS.length - 1 && (
                <span className="mx-1 text-slate-300">—</span>
              )}
            </li>
          );
        })}
      </ol>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div className="rounded-lg bg-white p-6 shadow">
            {STEPS[step].element}
          </div>

          {isLastStep && (
            <label className="mt-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span className="text-blue-900">
                I have reviewed the details above and confirm they are correct.
                Admission numbers are generated on submit and the record is
                created immediately.
              </span>
            </label>
          )}

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
                disabled={methods.formState.isSubmitting || !confirmed}
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

function Notice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl p-8">
      <div className="rounded-lg bg-white p-8 shadow">
        <h1 className="text-xl font-bold text-amber-700">{title}</h1>
        <p className="mt-3 text-gray-600">{children}</p>
        <Link
          to="/students/registry"
          className="mt-6 inline-block text-sm text-blue-700 hover:underline"
        >
          ← Back to the student registry
        </Link>
      </div>
    </div>
  );
}
