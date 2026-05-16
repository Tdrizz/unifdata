"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Stripe redirects here after 3DS auth with ?payment_intent=pi_xxx&payment_intent_client_secret=...
export default function SubscribeCompletePage() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const paymentIntentId = params.get("payment_intent");
    if (!paymentIntentId) {
      router.replace("/subscribe");
      return;
    }

    fetch("/api/stripe/confirm-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId }),
    })
      .then((res) => res.json())
      .then((data: { ok?: boolean; error?: string }) => {
        if (data.ok) {
          router.replace("/onboarding");
        } else {
          setError(data.error ?? "Payment could not be confirmed.");
          setStatus("error");
        }
      })
      .catch(() => {
        setError("Something went wrong. Please contact support.");
        setStatus("error");
      });
  }, [params, router]);

  if (status === "error") {
    return (
      <div className="min-h-screen bg-ud-page flex items-center justify-center px-4">
        <div className="w-full max-w-[440px] rounded-[16px] border border-ud bg-ud-surface shadow-ud-raised p-[32px] text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ud-danger">
            Payment issue
          </p>
          <h1 className="mt-[8px] text-[20px] font-semibold text-ud-ink">
            Could not confirm payment
          </h1>
          <p className="mt-[8px] text-[13.5px] text-ud-muted">{error}</p>
          <a
            href="/subscribe"
            className="mt-[20px] inline-block rounded-[10px] bg-ud-ink px-[20px] py-[11px] text-[13.5px] font-semibold text-white"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ud-page flex items-center justify-center px-4">
      <p className="text-[14px] text-ud-muted">Confirming payment…</p>
    </div>
  );
}
