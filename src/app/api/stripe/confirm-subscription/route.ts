import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAppUser } from "@/lib/auth/session";
import { getStripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const { paymentIntentId } = (await request.json()) as { paymentIntentId?: string };

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Missing paymentIntentId." }, { status: 400 });
    }

    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status !== "succeeded") {
      return NextResponse.json(
        { error: `Payment not confirmed (status: ${intent.status}).` },
        { status: 402 },
      );
    }

    const client = await clerkClient();
    await client.users.updateUserMetadata(user.clerkUserId, {
      publicMetadata: { subscribed: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Confirmation failed.";
    console.error("[stripe.confirm-subscription]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
