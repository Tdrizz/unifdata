import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import type { Json } from "@/types/db";

export const runtime = "nodejs";

const ACTIVE_SUBSCRIPTION_STATUSES: Stripe.Subscription.Status[] = [
  "active",
  "trialing",
];

function getClerkUserId(subscription: Stripe.Subscription) {
  return typeof subscription.metadata.clerkUserId === "string"
    ? subscription.metadata.clerkUserId
    : null;
}

async function markSubscribed(clerkUserId: string, subscribed: boolean) {
  const client = await clerkClient();

  await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { subscribed },
  });
}

// Resolve a Clerk user from a Stripe customer id via the persisted profile
// column — fallback for events that carry no clerkUserId metadata.
async function clerkUserIdFromCustomer(customerId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("clerk_user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return profile?.clerk_user_id ?? null;
}

async function handleSubscription(subscription: Stripe.Subscription) {
  let clerkUserId = getClerkUserId(subscription);

  if (!clerkUserId && typeof subscription.customer === "string") {
    clerkUserId = await clerkUserIdFromCustomer(subscription.customer);
  }

  if (!clerkUserId) {
    console.warn("[stripe.webhook] Could not resolve user for subscription", {
      subscriptionId: subscription.id,
    });
    return;
  }

  // Keep the profile's stripe_customer_id current for future lookups.
  if (typeof subscription.customer === "string") {
    await createAdminClient()
      .from("profiles")
      .update({ stripe_customer_id: subscription.customer })
      .eq("clerk_user_id", clerkUserId);
  }

  await markSubscribed(
    clerkUserId,
    ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status),
  );
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
  if (!customerId) return;

  const clerkUserId = await clerkUserIdFromCustomer(customerId);
  if (!clerkUserId) {
    console.warn("[stripe.webhook] payment_failed for unknown customer", { customerId });
    return;
  }

  // next_payment_attempt === null means Stripe has exhausted its retries
  // (dunning is over); revoke access. Earlier failures only notify.
  const finalAttempt = invoice.next_payment_attempt == null;
  if (finalAttempt) {
    await markSubscribed(clerkUserId, false);
  }

  // Surface the failure to the owner's workspace notification bell.
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  if (profile) {
    const { data: membership } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", profile.id)
      .limit(1)
      .maybeSingle();
    if (membership) {
      await supabase.from("notifications").insert({
        company_id: membership.company_id,
        type: "billing",
        title: finalAttempt ? "Subscription payment failed" : "Payment issue",
        body: finalAttempt
          ? "Your subscription payment could not be collected and access has been paused. Update your payment method to restore access."
          : "A subscription payment attempt failed. Stripe will retry automatically — please check your payment method.",
        read: false,
      });
    }
  }
}

async function processEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const clerkUserId =
        typeof session.metadata?.clerkUserId === "string"
          ? session.metadata.clerkUserId
          : null;

      if (clerkUserId && session.mode === "subscription") {
        await markSubscribed(clerkUserId, true);
      }
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await handleSubscription(event.data.object as Stripe.Subscription);
      return;
    }

    case "invoice.payment_failed": {
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      return;
    }

    default:
      console.info("[stripe.webhook] Ignored event", { type: event.type });
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      getEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid Stripe signature.";
    console.error("[stripe.webhook] Signature verification failed", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error: eventInsertError } = await supabase
    .from("stripe_events")
    .insert({
      id: event.id,
      type: event.type,
      payload: event as unknown as Json,
    });

  if (eventInsertError) {
    if (eventInsertError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    console.error("[stripe.webhook] Event persistence failed", eventInsertError);
    return NextResponse.json(
      { error: "Webhook event could not be persisted." },
      { status: 500 },
    );
  }

  try {
    await processEvent(event);
  } catch (error) {
    console.error("[stripe.webhook] Event processing failed", {
      eventId: event.id,
      type: event.type,
      error,
    });

    await supabase
      .from("stripe_events")
      .update({
        processed_at: new Date().toISOString(),
        processing_error:
          error instanceof Error ? error.message : "Unknown processing error",
      })
      .eq("id", event.id);

    return NextResponse.json(
      { error: "Webhook event processing failed." },
      { status: 500 },
    );
  }

  await supabase
    .from("stripe_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", event.id);

  return NextResponse.json({ received: true });
}
