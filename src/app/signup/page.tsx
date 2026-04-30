"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthFrame } from "@/components/AuthFrame";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <AuthFrame
      title="Create workspace"
      description="Start building an industry-aware CRM and data management system for a business."
      footer={
        <p className="text-center text-sm text-slate-300">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-white underline">
            Log in
          </a>
        </p>
      }
    >
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-200">Email</label>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-200">Password</label>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </div>

        <button
          disabled={loading}
          className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating workspace..." : "Create account"}
        </button>
      </form>

      {message && (
        <div className="mt-4 rounded-2xl border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-100">
          {message}
        </div>
      )}
    </AuthFrame>
  );
}
