"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";

export function ChangePasswordForm() {
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!currentPassword) {
      setError("Current password is required.");
      return;
    }

    if (!user) {
      setError("Could not verify your session. Please sign in again.");
      return;
    }

    setLoading(true);
    try {
      await user.updatePassword({ currentPassword, newPassword: password });
      setSuccess(true);
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-[22px]">
      <div>
        <label className="block text-[13px] font-medium text-ud-ink">
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-[14px] py-[10px] text-[13.5px] text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/20"
          />
        </label>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-ud-ink">
          New password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-[14px] py-[10px] text-[13.5px] text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/20"
          />
        </label>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-ud-ink">
          Confirm new password
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Same password again"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-[14px] py-[10px] text-[13.5px] text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/20"
          />
        </label>
      </div>

      {success && (
        <div className="rounded-[10px] border border-ud-success/20 bg-ud-success-bg p-3 text-[13px] text-ud-success">
          Password updated successfully.
        </div>
      )}

      {error && (
        <div className="rounded-[10px] border border-ud-danger/20 bg-ud-danger-bg p-3 text-[13px] text-ud-danger">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-[10px] bg-ud-ink px-[16px] py-[9px] text-[13.5px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </div>
    </form>
  );
}
