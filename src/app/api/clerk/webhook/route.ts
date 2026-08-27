import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/db";

export const runtime = "nodejs";

// Clerk Billing status values that should keep access on. `past_due` is a
// grace period (Clerk is still retrying the payment) -- mirrors the old
// Stripe webhook's ACTIVE_SUBSCRIPTION_STATUSES. Everything else (canceled,
// ended, expired, abandoned, incomplete, upcoming) revokes access.
const ACTIVE_STATUSES = new Set(["active", "past_due"]);

type ClerkSubscriptionWebhookData = {
  status: string;
  payer?: { user_id?: string } | null;
};

// Mirror the owner's live Clerk Billing status onto their company, so access
// reflects the company's billing state for EVERY member -- not just the
// paying owner. This is what stops an invited member from keeping access
// after the owner cancels. (has({ plan }) itself already gates the owner.)
async function markCompanySubscribed(clerkUserId: string, active: boolean) {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  if (!profile) return;

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", profile.id)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();
  if (!membership) return;

  await supabase
    .from("companies")
    .update({ subscription_active: active })
    .eq("id", membership.company_id);
}

async function handleSubscriptionEvent(data: ClerkSubscriptionWebhookData) {
  const clerkUserId = data.payer?.user_id;

  if (!clerkUserId) {
    console.warn("[clerk.webhook] Subscription event carried no payer.user_id", {
      status: data.status,
    });
    return;
  }

  const active = ACTIVE_STATUSES.has(data.status);
  await markCompanySubscribed(clerkUserId, active);
}

export async function POST(request: NextRequest) {
  let event: Awaited<ReturnType<typeof verifyWebhook>>;

  try {
    event = await verifyWebhook(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Clerk webhook signature.";
    console.error("[clerk.webhook] Signature verification failed", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const eventId = request.headers.get("svix-id");

  if (!eventId) {
    return NextResponse.json({ error: "Missing svix-id header." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error: eventInsertError } = await supabase.from("clerk_events").insert({
    id: eventId,
    type: event.type,
    payload: event as unknown as Json,
  });

  if (eventInsertError) {
    if (eventInsertError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    console.error("[clerk.webhook] Event persistence failed", eventInsertError);
    return NextResponse.json({ error: "Webhook event could not be persisted." }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "subscription.created":
      case "subscription.updated":
      case "subscription.active":
      case "subscription.pastDue":
        await handleSubscriptionEvent(event.data as unknown as ClerkSubscriptionWebhookData);
        break;
      default:
        console.info("[clerk.webhook] Ignored event", { type: event.type });
    }
  } catch (error) {
    console.error("[clerk.webhook] Event processing failed", {
      eventId,
      type: event.type,
      error,
    });

    await supabase
      .from("clerk_events")
      .update({
        processed_at: new Date().toISOString(),
        processing_error: error instanceof Error ? error.message : "Unknown processing error",
      })
      .eq("id", eventId);

    return NextResponse.json({ error: "Webhook event processing failed." }, { status: 500 });
  }

  await supabase
    .from("clerk_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", eventId);

  return NextResponse.json({ received: true });
}
