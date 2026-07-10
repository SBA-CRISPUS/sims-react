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
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
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

  // Neutral outcome either way so the form can't be used to probe
  // which email addresses have SIMS accounts.
  async function sendReset() {
    const email = getValues("email").trim();
    if (!email) {
      setLoginError("Enter your email address first.");
      return;
    }
    setLoginError(null);
    setResetBusy(true);
    try {
      await AuthService.resetPassword(email);
    } catch (error) {
      console.error(error);
    } finally {
      setResetBusy(false);
      setResetSent(true);
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

        <div className="mt-4 text-center text-sm">
          {!resetMode ? (
            <button
              type="button"
              onClick={() => setResetMode(true)}
              className="text-blue-700 hover:underline"
            >
              Forgot password?
            </button>
          ) : resetSent ? (
            <p className="rounded bg-green-50 p-3 text-green-800">
              If an account exists for that email, a password-reset link has
              been sent. Check your inbox (and spam folder), then sign in
              with your new password.
            </p>
          ) : (
            <div className="rounded bg-slate-50 p-3">
              <p className="text-gray-600">
                Enter your email address above, then
              </p>
              <button
                type="button"
                onClick={sendReset}
                disabled={resetBusy}
                className="mt-1 font-medium text-blue-700 hover:underline disabled:opacity-50"
              >
                {resetBusy ? "Sending..." : "Send password-reset email"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
