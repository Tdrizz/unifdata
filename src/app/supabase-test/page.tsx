import { createClient } from "@/lib/supabase/server";

export default async function SupabaseTestPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-white p-8 text-slate-950">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-black">
          Supabase Connection Test
        </h1>

        <p className="mt-4 text-slate-700">
          If this page loads without crashing, your Supabase server client is
          wired up.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-100 p-4 text-sm text-slate-900">
          <p>
            <span className="font-semibold text-black">User:</span>{" "}
            {user ? user.email : "No user logged in yet"}
          </p>

          <p className="mt-2">
            <span className="font-semibold text-black">Error:</span>{" "}
            {error ? error.message : "No error"}
          </p>
        </div>
      </div>
    </main>
  );
}