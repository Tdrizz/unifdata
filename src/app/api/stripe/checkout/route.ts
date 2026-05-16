import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireAppUser();
    const appUrl = getEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email || undefined,
      line_items: [
        {
          price: getEnv("STRIPE_PRICE_ID"),
          quantity: 1,
        },
      ],
      metadata: {
        clerkUserId: user.clerkUserId,
        profileId: user.profileId,
      },
      subscription_data: {
        metadata: {
          clerkUserId: user.clerkUserId,
          profileId: user.profileId,
        },
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create checkout.";
    console.error("[stripe.checkout]", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
