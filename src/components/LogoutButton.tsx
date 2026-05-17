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
      ? "w-full rounded-[8px] border border-white/[0.08] bg-transparent px-3 py-[7px] text-[12.5px] font-semibold text-[#3d5166] hover:bg-white/[0.05] hover:text-[#8b98a8]"
      : "rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-3 py-2 text-[13px] font-semibold text-ud-muted hover:text-ud-ink hover:border-[rgba(23,22,20,0.14)]";

  return (
    <button onClick={handleLogout} className={className}>
      Log out
    </button>
  );
}
