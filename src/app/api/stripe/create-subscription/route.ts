import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe/client";

export async function POST() {
  try {
    const user = await requireAppUser();
    const stripe = getStripe();
    const priceId = getEnv("STRIPE_PRICE_ID");
    const setupPriceId = getEnv("STRIPE_PRICE_ID_SETUP");

    // Find or create Stripe customer
    const existing = await stripe.customers.search({
      query: `metadata["clerkUserId"]:"${user.clerkUserId}"`,
      limit: 1,
    });

    let customerId: string;
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.fullName || undefined,
        metadata: { clerkUserId: user.clerkUserId, profileId: user.profileId },
      });
      customerId = customer.id;
    }

    // Create incomplete subscription — payment collected client-side via PaymentElement
    // add_invoice_items charges the one-time setup fee on the first invoice only
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      add_invoice_items: [{ price: setupPriceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { clerkUserId: user.clerkUserId, profileId: user.profileId },
    });

    const invoice = subscription.latest_invoice as import("stripe").Stripe.Invoice & {
      payment_intent: import("stripe").Stripe.PaymentIntent | null;
    };
    const intent = invoice?.payment_intent;

    if (!intent?.client_secret) {
      return NextResponse.json(
        { error: "Could not initialize payment." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      clientSecret: intent.client_secret,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start subscription.";
    console.error("[stripe.create-subscription]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
