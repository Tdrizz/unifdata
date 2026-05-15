"use client";

import { SignOutButton } from "@clerk/nextjs";

export function LogoutButton({
  variant = "default",
}: {
  variant?: "default" | "sidebar";
}) {
  const className =
    variant === "sidebar"
      ? "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10 hover:text-white"
      : "rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950";

  return (
    <SignOutButton redirectUrl="/">
      <button className={className}>Log out</button>
    </SignOutButton>
  );
}
