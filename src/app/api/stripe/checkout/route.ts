import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe/client";

/**
 * Step-based checkout:
 * step=setup → charges $300 once
 * step=sub → starts $100/month subscription
 */
export async function POST(req: Request) {
  try {
    const user = await requireAppUser();
    const appUrl = getEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");

    const { step } = await req.json();

    const stripe = getStripe();

    // -----------------------------
    // STEP 1: SETUP FEE ($300)
    // -----------------------------
    if (step === "setup") {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: user.email || undefined,

        line_items: [
          {
            price: getEnv("STRIPE_PRICE_ID_SETUP"),
            quantity: 1,
          },
        ],

        metadata: {
          clerkUserId: user.clerkUserId,
          profileId: user.profileId,
          step: "setup",
        },

        success_url: `${appUrl}/checkout?setup=success`,
        cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      });

      return NextResponse.json({ url: session.url });
    }

    // -----------------------------
    // STEP 2: SUBSCRIPTION ($100/mo)
    // -----------------------------
    const session = await stripe.checkout.sessions.create({
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
        step: "subscription",
      },

      subscription_data: {
        metadata: {
          clerkUserId: user.clerkUserId,
          profileId: user.profileId,
        },
      },

      success_url: `${appUrl}/onboarding?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create checkout.";

    console.error("[stripe.checkout]", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
