import { useState } from "react";
import { useForm } from "react-hook-form";

import { SchoolOnboardingService } from "../../../domain/onboarding/SchoolOnboardingService";

import type {
  SchoolOnboardingRequest,
  SchoolOnboardingResult,
} from "../../../domain/onboarding/SchoolOnboardingService";

import { defaultSchool } from "../types";

export default function CreateSchoolPage() {
  const [result, setResult] = useState<SchoolOnboardingResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SchoolOnboardingRequest>({
    defaultValues: {
      school: defaultSchool,
      administrator: {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
      },
    },
  });

  async function onSubmit(data: SchoolOnboardingRequest) {
    setSubmitError(null);

    try {
      const onboarding = await SchoolOnboardingService.onboard(data);

      setResult(onboarding);
      reset();
    } catch (error) {
      console.error(error);
      // Surface the real reason (e.g. "A user with email ... already exists")
      // instead of hiding it. The school itself provisions before the admin
      // account is created, so a failure here means the school exists but the
      // administrator login could not be created - usually a duplicate email.
      const reason =
        error instanceof Error && error.message
          ? error.message
          : "Unknown error.";
      setSubmitError(
        `Onboarding failed after the school was provisioned: ${reason} ` +
          "The school may have been created without an administrator — check " +
          "the Schools list, and use an email that isn't already registered."
      );
    }
  }

  async function copyPassword() {
    if (!result) return;

    await navigator.clipboard.writeText(result.credentials.temporaryPassword);
    setCopied(true);
  }

  function closeWelcomePackage() {
    setResult(null);
    setCopied(false);
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto p-8">
        <div className="rounded-lg bg-white p-8 shadow">

          <h1 className="text-2xl font-bold text-green-700">
            School Onboarded
          </h1>

          <div className="mt-6 space-y-2">
            <p>
              <span className="font-medium">School:</span>{" "}
              {result.schoolName} ({result.schoolCode})
            </p>
            <p>
              <span className="font-medium">Administrator:</span>{" "}
              {result.administrator.displayName}
            </p>
            <p>
              <span className="font-medium">Email:</span>{" "}
              {result.administrator.email}
            </p>
          </div>

          <div className="mt-6">
            <p className="font-medium">Temporary Password</p>

            <div className="mt-1 flex items-center gap-3">
              <code className="rounded bg-slate-100 px-4 py-2 text-lg tracking-wider">
                {result.credentials.temporaryPassword}
              </code>

              <button
                onClick={copyPassword}
                className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <p className="mt-3 text-sm text-red-600">
              This password will never be shown again. Hand it to the
              administrator now.
            </p>
          </div>

          <button
            onClick={closeWelcomePackage}
            className="mt-8 w-full rounded border border-slate-300 px-5 py-2 hover:bg-slate-50"
          >
            Done
          </button>

        </div>
      </div>
    );
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

        <h2 className="text-xl font-semibold border-b pb-2">
          School Information
        </h2>

        <div>
          <label className="block font-medium">
            School Name
          </label>

          <input
            {...register("school.name", {
              required: "School name is required",
            })}
            className="w-full border rounded p-2"
          />

          {errors.school?.name && (
            <p className="mt-1 text-sm text-red-600">
              {errors.school.name.message}
            </p>
          )}
        </div>

        <div>
          <label className="block font-medium">
            EMIS Code
          </label>

          <input
            {...register("school.emisCode", {
              required: "EMIS code is required",
            })}
            className="w-full border rounded p-2"
          />

          {errors.school?.emisCode && (
            <p className="mt-1 text-sm text-red-600">
              {errors.school.emisCode.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block font-medium">
              School Type
            </label>

            <select
              {...register("school.schoolType")}
              className="w-full border rounded p-2"
            >
              <option>Primary</option>
              <option>Secondary</option>
              <option>Combined</option>
              <option>Technical</option>
            </select>
          </div>

          <div>
            <label className="block font-medium">
              Ownership
            </label>

            <select
              {...register("school.ownership")}
              className="w-full border rounded p-2"
            >
              <option>Government</option>
              <option>Grant Aided</option>
              <option>Private</option>
            </select>
          </div>

          <div>
            <label className="block font-medium">
              Subscription
            </label>

            <select
              {...register("school.subscription")}
              className="w-full border rounded p-2"
            >
              <option>Basic</option>
              <option>Professional</option>
              <option>Enterprise</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-medium">
            Province
          </label>

          <input
            {...register("school.location.province")}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">
            District
          </label>

          <input
            {...register("school.location.district")}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">
            Address
          </label>

          <input
            {...register("school.location.address")}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">
            Phone
          </label>

          <input
            {...register("school.contact.phone")}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">
            Email
          </label>

          <input
            {...register("school.contact.email")}
            className="w-full border rounded p-2"
          />
        </div>

        <h2 className="text-xl font-semibold border-b pb-2 pt-4">
          School Administrator
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">
              First Name
            </label>

            <input
              {...register("administrator.firstName", {
                required: "First name is required",
              })}
              className="w-full border rounded p-2"
            />

            {errors.administrator?.firstName && (
              <p className="mt-1 text-sm text-red-600">
                {errors.administrator.firstName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium">
              Last Name
            </label>

            <input
              {...register("administrator.lastName", {
                required: "Last name is required",
              })}
              className="w-full border rounded p-2"
            />

            {errors.administrator?.lastName && (
              <p className="mt-1 text-sm text-red-600">
                {errors.administrator.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block font-medium">
            Administrator Email
          </label>

          <input
            type="email"
            {...register("administrator.email", {
              required: "Administrator email is required",
            })}
            className="w-full border rounded p-2"
          />

          {errors.administrator?.email && (
            <p className="mt-1 text-sm text-red-600">
              {errors.administrator.email.message}
            </p>
          )}
        </div>

        <div>
          <label className="block font-medium">
            Administrator Phone
          </label>

          <input
            {...register("administrator.phone")}
            className="w-full border rounded p-2"
          />
        </div>

        {submitError && (
          <p className="text-sm text-red-600">
            {submitError}
          </p>
        )}

        <button
          disabled={isSubmitting}
          className="bg-blue-700 text-white px-5 py-2 rounded hover:bg-blue-800 disabled:opacity-50"
        >
          {isSubmitting ? "Onboarding School..." : "Onboard School"}
        </button>

      </form>
    </div>
  );
}
