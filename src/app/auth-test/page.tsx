import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AuthTestPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, created_at")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              FrontierOps
            </p>
            <h1 className="mt-2 text-3xl font-bold">Auth Test</h1>
            <p className="mt-2 text-slate-600">
              If you can see this page, Supabase Auth is working.
            </p>
          </div>

          <LogoutButton />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Current User</h2>

          <div className="mt-4 space-y-3 text-sm">
            <p>
              <span className="font-semibold">User ID:</span> {user.id}
            </p>

            <p>
              <span className="font-semibold">Email:</span> {user.email}
            </p>

            <p>
              <span className="font-semibold">Full name:</span>{" "}
              {profile?.full_name || "No profile name found"}
            </p>

            <p>
              <span className="font-semibold">Profile created:</span>{" "}
              {profile?.created_at || "No profile row found"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
          <h2 className="text-lg font-bold">What this proves</h2>

          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>The user can sign up.</li>
            <li>The user can log in.</li>
            <li>The server can read the current logged-in user.</li>
            <li>The profile trigger created a profile row.</li>
            <li>Logout works.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}