"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthFrame } from "@/components/AuthFrame";
import { createClient } from "@/lib/supabase/client";

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/workspace");
    router.refresh();
  }

  return (
    <AuthFrame
      title="Choose a new password"
      description="Set a new password for your account. You'll be signed in immediately after."
      footer={
        <p className="text-center text-sm text-slate-300">
          Changed your mind?{" "}
          <a href="/login" className="font-semibold text-white underline">
            Log in
          </a>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-200">
            New password
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-200">
            Confirm password
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
            type="password"
            placeholder="Same password again"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
            minLength={8}
          />
        </div>

        <button
          disabled={loading}
          className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Set new password"}
        </button>

        {error && (
          <div className="rounded-2xl border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-100">
            {error}
          </div>
        )}
      </form>
    </AuthFrame>
  );
}
