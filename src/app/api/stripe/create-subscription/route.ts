import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

    // Persist on the profile so webhooks can resolve the user without a
    // Stripe metadata search.
    await createAdminClient()
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.profileId);

    // Reuse any existing incomplete subscription so we don't create duplicates
    const existingSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "incomplete",
      limit: 1,
      expand: ["data.latest_invoice.payment_intent"],
    });

    type ExpandedSubscription = import("stripe").Stripe.Subscription & {
      latest_invoice: import("stripe").Stripe.Invoice & {
        payment_intent: import("stripe").Stripe.PaymentIntent | null;
      };
    };

    let subscription: ExpandedSubscription;

    if (existingSubs.data.length > 0) {
      subscription = existingSubs.data[0] as ExpandedSubscription;
    } else {
      // Create incomplete subscription — payment collected client-side via PaymentElement
      // add_invoice_items charges the one-time setup fee on the first invoice only
      subscription = (await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        add_invoice_items: [{ price: setupPriceId }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
        metadata: { clerkUserId: user.clerkUserId, profileId: user.profileId },
      })) as unknown as ExpandedSubscription;
    }

    const intent = subscription.latest_invoice?.payment_intent;

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
