"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({
  variant = "default",
}: {
  variant?: "default" | "sidebar";
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const className =
    variant === "sidebar"
      ? "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
      : "rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800";

  return (
    <button onClick={handleLogout} className={className}>
      Log out
    </button>
  );
}
