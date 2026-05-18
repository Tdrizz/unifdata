"use client";

import { SignOutButton } from "@clerk/nextjs";

export function LogoutButton({
  variant = "default",
}: {
  variant?: "default" | "sidebar";
}) {
  const className =
    variant === "sidebar"
      ? "logout-btn"
      : "rounded-[9px] border border-ud bg-ud-surface px-4 py-2 text-sm font-semibold text-ud-text shadow-ud hover:border-ud-hard transition-colors";

  return (
    <SignOutButton redirectUrl="/">
      <button className={className}>Log out</button>
    </SignOutButton>
  );
}
