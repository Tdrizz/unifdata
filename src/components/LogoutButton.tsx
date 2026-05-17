"use client";

import { SignOutButton } from "@clerk/nextjs";

export function LogoutButton({
  variant = "default",
}: {
  variant?: "default" | "sidebar";
}) {
  const className =
    variant === "sidebar"
      ? "w-full rounded-[8px] border border-white/[0.08] px-3 py-1.5 text-[12.5px] font-semibold text-[#3d5166] bg-transparent hover:bg-white/[0.05] hover:text-[#8b98a8] transition-colors"
      : "rounded-[9px] border border-ud bg-ud-surface px-4 py-2 text-sm font-semibold text-ud-text shadow-ud hover:border-ud-hard transition-colors";

  return (
    <SignOutButton redirectUrl="/">
      <button className={className}>Log out</button>
    </SignOutButton>
  );
}
