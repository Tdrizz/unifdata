"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export function CheckoutButton() {
  const { isSignedIn } = useAuth();

  return (
    <Link
      href={isSignedIn ? "/subscribe" : "/waitlist"}
      className="block w-full rounded-2xl bg-white px-5 py-4 text-center text-lg font-semibold text-slate-950 transition-colors hover:bg-slate-200"
    >
      {isSignedIn ? "Set up workspace" : "Request access"}
    </Link>
  );
}
