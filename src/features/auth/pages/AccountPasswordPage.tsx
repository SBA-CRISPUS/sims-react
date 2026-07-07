import { useState } from "react";
import { Link } from "react-router-dom";

import ChangePasswordForm from "../components/ChangePasswordForm";

/** Voluntary password change, linked from the header. */
export default function AccountPasswordPage() {
  const [done, setDone] = useState(false);

  return (
    <div className="p-8">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold">Change password</h1>
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          {done ? (
            <div className="text-center">
              <p className="font-medium text-green-700">Password changed.</p>
              <Link
                to="/"
                className="mt-4 inline-block text-sm text-blue-700 hover:underline"
              >
                Back to dashboard
              </Link>
            </div>
          ) : (
            <ChangePasswordForm onDone={() => setDone(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
