import { redirect } from "next/navigation";
import { PricingTable } from "@clerk/nextjs";
import { hasLiveSubscription, requireAppUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SubscribePage() {
  const user = await requireAppUser();

  // user.subscribed reflects has({ plan }), which can lag right after a
  // checkout that just completed (see hasLiveSubscription's comment in
  // session.ts) -- without this fallback, reloading this page right after
  // paying just showed the pricing table again instead of moving on.
  if (user.subscribed || (await hasLiveSubscription(user.clerkUserId))) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-ud-page flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[480px]">
        <div className="mb-6 text-center">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ud-muted">
            Start your workspace
          </p>
          <h1 className="mt-[6px] text-[24px] font-semibold tracking-[-0.015em] text-ud-ink">
            $100/month, cancel any time
          </h1>
          <p className="mt-[4px] text-[13.5px] text-ud-muted">
            Signing up as <span className="font-medium text-ud-ink">{user.email}</span>
          </p>
        </div>
        <PricingTable newSubscriptionRedirectUrl="/onboarding" />
      </div>
    </div>
  );
}
