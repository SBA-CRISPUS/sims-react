import { useState } from "react";

import { AuthService } from "../services/AuthService";
import { UserProfileService } from "../services/UserProfileService";
import { useAuth } from "../hooks/useAuth";

function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return "The current password is incorrect.";
  }
  if (code === "auth/weak-password") {
    return "The new password is too weak (minimum 8 characters).";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts — wait a moment and try again.";
  }
  return e instanceof Error && e.message
    ? e.message
    : "Could not change the password.";
}

/**
 * Change-password form shared by the forced first-login gate and the
 * voluntary /account/password page. On success it also clears the
 * profile's mustChangePassword flag.
 */
export default function ChangePasswordForm({
  onDone,
}: {
  onDone: () => void;
}) {
  const { profile } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError("The new password must be at least 8 characters.");
      return;
    }
    if (next === current) {
      setError("The new password must be different from the current one.");
      return;
    }
    if (next !== confirm) {
      setError("The new passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await AuthService.changePassword(current, next);
      if (profile?.mustChangePassword) {
        // Best-effort: the password change itself already succeeded.
        await UserProfileService.clearMustChangePassword(profile.uid).catch(
          () => undefined
        );
      }
      onDone();
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600">Current password</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          className="mt-1 w-full rounded border p-2"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600">New password</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          className="mt-1 w-full rounded border p-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          At least 8 characters. Use something you don't use elsewhere.
        </p>
      </div>
      <div>
        <label className="block text-sm text-gray-600">
          Confirm new password
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="mt-1 w-full rounded border p-2"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy || !current || !next || !confirm}
        className="w-full rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {busy ? "Changing..." : "Change password"}
      </button>
    </form>
  );
}
