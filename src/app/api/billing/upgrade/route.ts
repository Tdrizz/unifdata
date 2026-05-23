import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth/session";
import { getCurrentCompany } from "@/lib/current-company";
import { getStripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAppUser();
    const currentCompany = await getCurrentCompany();
    if (!currentCompany) {
      return NextResponse.redirect("/onboarding");
    }

    const { company } = currentCompany;

    if (company.tier === "pro") {
      return NextResponse.redirect(new URL("/settings?toast=Already+on+Pro+plan", process.env.NEXT_PUBLIC_APP_URL ?? ""));
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const priceId = process.env.STRIPE_PRICE_ID_PRO ?? process.env.STRIPE_PRICE_ID;

    if (!priceId) {
      return NextResponse.redirect(new URL("/settings?error=Billing+not+configured", appUrl));
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        companyId: company.id,
        planUpgrade: "pro",
      },
      subscription_data: {
        metadata: {
          companyId: company.id,
          planUpgrade: "pro",
        },
      },
      success_url: `${appUrl}/settings?toast=Upgraded+to+Pro`,
      cancel_url: `${appUrl}/settings`,
    });

    if (!session.url) {
      return NextResponse.redirect(new URL("/settings?error=Checkout+unavailable", appUrl));
    }

    return NextResponse.redirect(session.url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[billing.upgrade]", message);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent("Upgrade failed. Please try again.")}`, appUrl));
  }
}
