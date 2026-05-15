"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";

export function CheckoutButton() {
  const { isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    setError("");

    if (!isSignedIn) {
      window.location.href = "/sign-in?redirect_url=/pricing";
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Checkout could not be started.");
      }

      window.location.href = payload.url;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout could not be started.",
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="block w-full rounded-2xl bg-white px-5 py-4 text-center text-lg font-semibold text-slate-950 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Opening checkout..." : "Start subscription"}
      </button>
      {error && (
        <p className="mt-3 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      )}
    </div>
  );
}
