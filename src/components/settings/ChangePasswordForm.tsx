"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
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

    setLoading(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setError("Could not verify your session. Please sign in again.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      setError("Current password is incorrect.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setPassword("");
    setConfirm("");
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
        <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 p-3 text-[13px] text-emerald-700">
          Password updated successfully.
        </div>
      )}

      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
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
