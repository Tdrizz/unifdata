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

async function handleSubscription(subscription: Stripe.Subscription) {
  const clerkUserId = getClerkUserId(subscription);

  if (!clerkUserId) {
    console.warn("[stripe.webhook] Missing clerkUserId metadata", {
      subscriptionId: subscription.id,
    });
    return;
  }

  await markSubscribed(
    clerkUserId,
    ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status),
  );
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
