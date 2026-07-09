import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useDepartments } from "../../subjects/hooks/subjectQueries";
import { useRegisterTeacher } from "../hooks/teacherQueries";
import type { TeacherRegistrationRequest } from "../../../domain/teachers/Teacher";

const EMPLOYMENT_TYPES = ["Permanent", "Contract", "Temporary"];

export default function TeacherRegisterPage() {
  const { school, firebaseUser } = useAuth();
  const schoolCode = school?.schoolCode;
  const navigate = useNavigate();

  const departments = useDepartments(schoolCode);
  const register_ = useRegisterTeacher(schoolCode ?? "");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TeacherRegistrationRequest>({
    defaultValues: {
      title: "",
      firstName: "",
      lastName: "",
      gender: "Male",
      phone: "",
      email: "",
      departmentId: "",
      employmentType: "Permanent",
      qualification: "",
      tscNumber: "",
    },
  });

  async function onSubmit(data: TeacherRegistrationRequest) {
    if (!schoolCode || !firebaseUser) return;
    setSubmitError(null);
    try {
      const result = await register_.mutateAsync({
        actorUid: firebaseUser.uid,
        request: { ...data, departmentId: data.departmentId || null },
      });
      navigate(`/teachers/${result.employeeNumber}`);
    } catch (err) {
      console.error(err);
      setSubmitError(
        "Registration failed. This needs an internet connection - check it and try again."
      );
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <Link to="/teachers" className="text-sm text-blue-700 hover:underline">
        ← Back to Teachers
      </Link>
      <h1 className="mt-3 text-3xl font-bold mb-6">Register Teacher</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block font-medium">Title</label>
            <input {...register("title")} className="w-full border rounded p-2" />
          </div>
          <div className="col-span-2">
            <label className="block font-medium">First Name</label>
            <input
              {...register("firstName", { required: "First name is required" })}
              className="w-full border rounded p-2"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <label className="block font-medium">Gender</label>
            <select {...register("gender")} className="w-full border rounded p-2">
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-medium">Last Name</label>
          <input
            {...register("lastName", { required: "Last name is required" })}
            className="w-full border rounded p-2"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">Phone</label>
            <input {...register("phone")} className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block font-medium">Email</label>
            <input
              type="email"
              {...register("email", { required: "Email is required" })}
              className="w-full border rounded p-2"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">Department</label>
            <select
              {...register("departmentId")}
              className="w-full border rounded p-2"
            >
              <option value="">Unassigned</option>
              {(departments.data ?? [])
                .filter((d) => d.active !== false)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block font-medium">Employment Type</label>
            <select
              {...register("employmentType")}
              className="w-full border rounded p-2"
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">Qualification</label>
            <input
              {...register("qualification")}
              className="w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block font-medium">TSC Number</label>
            <input
              {...register("tscNumber")}
              className="w-full border rounded p-2"
            />
          </div>
        </div>

        {submitError && (
          <p className="text-sm text-red-600">{submitError}</p>
        )}

        <button
          disabled={isSubmitting}
          className="bg-blue-700 text-white px-5 py-2 rounded hover:bg-blue-800 disabled:opacity-50"
        >
          {isSubmitting ? "Registering..." : "Register Teacher"}
        </button>
      </form>
    </div>
  );
}
