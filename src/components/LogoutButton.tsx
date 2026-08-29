"use client";

import type { ReactNode } from "react";
import { SignOutButton } from "@clerk/nextjs";

export function LogoutButton({
  variant = "default",
  className: classNameOverride,
  children,
}: {
  variant?: "default" | "sidebar";
  className?: string;
  children?: ReactNode;
}) {
  const className =
    classNameOverride ??
    (variant === "sidebar"
      ? "logout-btn"
      : "rounded-[9px] border border-ud bg-ud-surface px-4 py-2 text-sm font-semibold text-ud-text shadow-ud hover:border-ud-hard transition-colors");

  return (
    <SignOutButton redirectUrl="/">
      <button className={className}>{children ?? "Log out"}</button>
    </SignOutButton>
  );
}
