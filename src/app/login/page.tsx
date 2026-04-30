"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthFrame } from "@/components/AuthFrame";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/workspace");
    router.refresh();
  }

  return (
    <AuthFrame
      title="Log in"
      description="Access your company workspace and continue organizing the business."
      footer={
        <p className="text-center text-sm text-slate-300">
          Need an account?{" "}
          <a href="/signup" className="font-semibold text-white underline">
            Create one
          </a>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
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
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <button
          disabled={loading}
          className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Log in"}
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
