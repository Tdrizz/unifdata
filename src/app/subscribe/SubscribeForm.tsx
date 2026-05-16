"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

const FEATURES = [
  "Industry-aware CRM workspace",
  "Customers, leads, jobs, sales & follow-ups",
  "AI operating brief & priority queue",
  "Data health scoring & cleanup tools",
  "QuickBooks, Square, Jobber, HubSpot sync",
  "Secure, isolated company workspace",
];

type Step = 1 | 2;

function CheckIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-ud-accent shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PaymentForm({
  clientSecret,
  onSuccess,
}: {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/subscribe/complete`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      await onSuccess(paymentIntent.id);
    } else {
      setError("Payment not completed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-[18px]">
      <PaymentElement
        options={{
          layout: "tabs",
          fields: { billingDetails: { email: "auto" } },
        }}
      />

      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-[14px] py-[11px] text-[13px] text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full rounded-[10px] bg-ud-ink px-[18px] py-[13px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Processing…" : "Pay $300 — Start workspace"}
      </button>

      <p className="flex items-center justify-center gap-[6px] text-[11.5px] text-ud-faint">
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Secured by Stripe · $100/month after 30 days
      </p>
    </form>
  );
}

export function SubscribeForm({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingSecret, setLoadingSecret] = useState(false);
  const [initError, setInitError] = useState("");

  async function handleContinue() {
    setLoadingSecret(true);
    setInitError("");
    try {
      const res = await fetch("/api/stripe/create-subscription", { method: "POST" });
      const data = (await res.json()) as { clientSecret?: string; error?: string };
      if (!res.ok || !data.clientSecret) {
        setInitError(data.error ?? "Could not initialize payment. Please try again.");
        return;
      }
      setClientSecret(data.clientSecret);
      setStep(2);
    } finally {
      setLoadingSecret(false);
    }
  }

  async function handleSuccess(paymentIntentId: string) {
    const res = await fetch("/api/stripe/confirm-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId }),
    });
    if (res.ok) {
      router.push("/onboarding");
    } else {
      const data = (await res.json()) as { error?: string };
      // Payment went through but metadata update may retry via webhook
      // Send to onboarding anyway — webhook will catch it
      console.error("[subscribe] confirm error", data.error);
      router.push("/onboarding");
    }
  }

  return (
    <div className="min-h-screen bg-ud-page flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[480px]">

        {/* Progress */}
        <div className="flex items-center gap-[8px] mb-[28px]">
          {([1, 2] as Step[]).map((s) => (
            <div
              key={s}
              className="flex-1 h-[4px] rounded-full transition-colors"
              style={{ background: s <= step ? "var(--ud-accent)" : "var(--ud-border)" }}
            />
          ))}
        </div>

        {/* Step 1: Plan review */}
        {step === 1 && (
          <div className="rounded-[16px] border border-ud bg-ud-surface shadow-ud-raised overflow-hidden">
            {/* Header */}
            <div className="px-[28px] pt-[28px] pb-[22px] border-b border-ud">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ud-muted">
                Step 1 of 2 — Review
              </p>
              <h1 className="mt-[6px] text-[24px] font-semibold tracking-[-0.015em] text-ud-ink">
                Your UnifData workspace
              </h1>
              <p className="mt-[4px] text-[13.5px] text-ud-muted">
                Signing up as <span className="font-medium text-ud-ink">{userEmail}</span>
              </p>
            </div>

            {/* Pricing */}
            <div className="px-[28px] py-[22px] border-b border-ud">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[32px] font-bold tracking-[-0.02em] text-ud-ink">$300</span>
                  <span className="ml-[6px] text-[14px] text-ud-muted">one-time setup</span>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-ud-ink">then $100<span className="text-ud-muted font-normal">/mo</span></p>
                  <p className="text-[11px] text-ud-faint">starts after 30 days</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="px-[28px] py-[20px] space-y-[10px]">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-[10px]">
                  <CheckIcon />
                  <span className="text-[13.5px] text-ud-text">{f}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-[28px] pb-[28px]">
              {initError && (
                <div className="mb-[14px] rounded-[10px] border border-red-200 bg-red-50 px-[14px] py-[11px] text-[13px] text-red-700">
                  {initError}
                </div>
              )}
              <button
                onClick={handleContinue}
                disabled={loadingSecret}
                className="w-full rounded-[10px] bg-ud-ink px-[18px] py-[13px] text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingSecret ? "Loading…" : "Continue to payment →"}
              </button>
              <p className="mt-[10px] text-center text-[11.5px] text-ud-faint">
                No contract · cancel monthly subscription anytime
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && clientSecret && (
          <div className="rounded-[16px] border border-ud bg-ud-surface shadow-ud-raised overflow-hidden">
            {/* Header */}
            <div className="px-[28px] pt-[28px] pb-[22px] border-b border-ud">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ud-muted">
                Step 2 of 2 — Payment
              </p>
              <h1 className="mt-[6px] text-[24px] font-semibold tracking-[-0.015em] text-ud-ink">
                Payment details
              </h1>
            </div>

            {/* Plan recap */}
            <div className="mx-[28px] mt-[22px] rounded-[10px] bg-ud-surface-soft border border-ud px-[16px] py-[12px] flex justify-between items-center">
              <div>
                <p className="text-[13.5px] font-semibold text-ud-ink">UnifData — Setup</p>
                <p className="text-[12px] text-ud-muted">then $100/month after 30 days</p>
              </div>
              <p className="text-[18px] font-bold text-ud-ink tabular-nums">$300</p>
            </div>

            {/* Stripe form */}
            <div className="px-[28px] pt-[20px] pb-[28px]">
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "flat",
                    variables: {
                      colorPrimary: "#5C6F1A",
                      colorBackground: "#ffffff",
                      colorText: "#171614",
                      colorDanger: "#a83232",
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      borderRadius: "10px",
                      spacingUnit: "4px",
                    },
                    rules: {
                      ".Input": {
                        border: "1.5px solid rgba(23,22,20,0.10)",
                        padding: "10px 14px",
                        fontSize: "13.5px",
                      },
                      ".Input:focus": {
                        border: "1.5px solid #5C6F1A",
                        boxShadow: "0 0 0 3px rgba(92,111,26,0.12)",
                      },
                      ".Label": {
                        fontSize: "12.5px",
                        fontWeight: "600",
                        color: "#6b6760",
                        marginBottom: "6px",
                      },
                    },
                  },
                }}
              >
                <PaymentForm clientSecret={clientSecret} onSuccess={handleSuccess} />
              </Elements>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
