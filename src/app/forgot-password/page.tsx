"use client";

import { useState } from "react";
import { AuthFrame } from "@/components/AuthFrame";
import { createClient } from "@/lib/supabase/client";

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <AuthFrame
      title="Reset password"
      description="Enter your email and we'll send you a link to reset your password."
      footer={
        <p className="text-center text-sm text-slate-300">
          Remember it?{" "}
          <a href="/login" className="font-semibold text-white underline">
            Log in
          </a>
        </p>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-5 text-sm leading-6 text-emerald-100">
          <p className="font-semibold">Check your inbox</p>
          <p className="mt-1">
            A password reset link has been sent to <strong>{email}</strong>. It
            expires in 1 hour.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-200">Email</label>
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>

          {error && (
            <div className="rounded-2xl border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-100">
              {error}
            </div>
          )}
        </form>
      )}
    </AuthFrame>
  );
}
