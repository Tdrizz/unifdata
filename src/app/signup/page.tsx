"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
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
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/auth-test");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
          <a href="/" className="text-sm font-semibold text-slate-300">
            ← Back to home
          </a>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              FrontierOps
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              Create your account
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Sign up to start setting up your business dashboard.
            </p>
          </div>

          <form onSubmit={handleSignup} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-200">
                Full name
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
                placeholder="Tittan Olson"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-200">
                Email
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-200">
                Password
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-white/40"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <button
              disabled={loading}
              className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          {message && (
            <div className="mt-4 rounded-xl border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-100">
              {message}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-300">
            Already have an account?{" "}
            <a href="/login" className="font-semibold text-white underline">
              Log in
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}