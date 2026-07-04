import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { AuthService } from "../services/AuthService";
import { useAuth } from "../hooks/useAuth";

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { firebaseUser } = useAuth();

  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>();

  if (firebaseUser) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit({ email, password }: LoginFormValues) {
    setLoginError(null);

    try {
      await AuthService.login(email, password);
    } catch (error) {
      console.error(error);
      setLoginError("Invalid email or password.");
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">

        <h1 className="text-2xl font-bold text-center">
          SIMS Login
        </h1>

        <p className="mt-1 text-center text-sm text-gray-500">
          School Information Management System
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-5"
        >

          <div>
            <label className="block font-medium">
              Email
            </label>

            <input
              type="email"
              autoComplete="email"
              {...register("email", {
                required: "Email is required",
              })}
              className="w-full border rounded p-2"
            />

            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium">
              Password
            </label>

            <input
              type="password"
              autoComplete="current-password"
              {...register("password", {
                required: "Password is required",
              })}
              className="w-full border rounded p-2"
            />

            {errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {loginError && (
            <p className="text-sm text-red-600">
              {loginError}
            </p>
          )}

          <button
            disabled={isSubmitting}
            className="w-full bg-blue-700 text-white px-5 py-2 rounded hover:bg-blue-800 disabled:opacity-50"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>

        </form>
      </div>
    </div>
  );
}
