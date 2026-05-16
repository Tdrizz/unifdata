import { redirect } from "next/navigation";
import Link from "next/link";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAppUser } from "@/lib/auth/session";
import { getStripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const user = await requireAppUser();

  // If already subscribed (e.g. returning to this page), go straight to onboarding
  if (user.subscribed) {
    redirect("/onboarding");
  }

  // Verify the Stripe session directly — don't wait for webhook
  if (session_id) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(session_id);

      const isPaid =
        session.payment_status === "paid" || session.status === "complete";

      if (isPaid) {
        const client = await clerkClient();
        await client.users.updateUserMetadata(user.clerkUserId, {
          publicMetadata: { subscribed: true },
        });
        redirect("/onboarding");
      }
    } catch (error) {
      console.error("[checkout.success] Session verification failed", error);
    }
  }

  // Payment not confirmed — either no session_id or session isn't paid yet
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#090e1a] px-6 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
          <svg
            className="h-8 w-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Subscription not confirmed
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          We couldn&apos;t verify your payment. If you completed checkout, wait
          a moment and try again — it sometimes takes a few seconds.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/pricing"
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200"
          >
            Return to pricing
          </Link>
          <a
            href={`/checkout/success${session_id ? `?session_id=${session_id}` : ""}`}
            className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Try again
          </a>
        </div>
        <p className="mt-6 text-xs text-slate-500">
          Already subscribed?{" "}
          <Link href="/onboarding" className="underline hover:text-slate-300">
            Continue setup
          </Link>
        </p>
      </div>
    </main>
  );
}
