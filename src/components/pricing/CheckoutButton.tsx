"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export function CheckoutButton() {
  const { isSignedIn } = useAuth();

  return (
    <Link
      href={isSignedIn ? "/subscribe" : "/waitlist"}
      className="block w-full rounded-[10px] bg-ud-accent px-5 py-4 text-center text-lg font-semibold text-white transition-opacity hover:opacity-90"
    >
      {isSignedIn ? "Set up workspace" : "Request access"}
    </Link>
  );
}
