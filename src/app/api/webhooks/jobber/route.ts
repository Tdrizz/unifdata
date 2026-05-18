import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAutomationQueue, JOB_LOST_QUOTE_EMAIL } from "@/lib/queue/client";
import type { LostQuoteEmailJobData } from "@/lib/queue/jobs/lost-quote";

export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;

// Jobber uses HMAC-SHA256 with the app secret, hex-encoded.
function validateJobberSignature(secret: string, rawBody: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// Jobber quote statuses that indicate a lost quote.
const LOST_STATUSES = new Set(["CLOSED", "ARCHIVED", "EXPIRED", "closed", "archived", "expired"]);

type JobberWebhookPayload = {
  webHookEvent?: string;
  itemId?: string;
  accountId?: string;
  topic?: string;
  data?: {
    quote?: {
      id?: string;
      quoteStatus?: string;
      total?: number;
      client?: {
        id?: string;
        name?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  const signature = request.headers.get("x-jobber-hmac-sha256") ?? "";
  const rawBody = await request.text();

  const secret = process.env.JOBBER_CLIENT_SECRET;
  if (!secret) {
    console.error("[jobber.webhook] Missing JOBBER_CLIENT_SECRET");
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  if (!validateJobberSignature(secret, rawBody, signature)) {
    console.warn("[jobber.webhook] Signature validation failed");
    return NextResponse.json(
      { error: "Webhook Security Validation Failed: Unauthorized Signature Forgery." },
      { status: 401 },
    );
  }

  let payload: JobberWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as JobberWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const event = payload.webHookEvent ?? payload.topic ?? "";
  if (!event.toUpperCase().includes("QUOTE")) {
    return NextResponse.json({ received: true });
  }

  const quote = payload.data?.quote;
  const quoteStatus = quote?.quoteStatus ?? "";

  if (!LOST_STATUSES.has(quoteStatus)) {
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  // Find the company linked to this Jobber account.
  const accountId = payload.accountId ?? "";
  const { data: integration } = await supabase
    .from("integrations")
    .select("company_id")
    .eq("provider", "jobber")
    .eq("status", "active")
    .contains("metadata", { account_id: accountId })
    .maybeSingle();

  // Fall back: find the first active Jobber integration if account_id isn't stored.
  const { data: fallbackIntegration } = !integration
    ? await supabase
        .from("integrations")
        .select("company_id")
        .eq("provider", "jobber")
        .eq("status", "active")
        .limit(1)
        .maybeSingle()
    : { data: null };

  const companyId = (integration ?? fallbackIntegration)?.company_id as string | undefined;
  if (!companyId) {
    console.warn("[jobber.webhook] No matching Jobber integration found", { accountId });
    return NextResponse.json({ received: true });
  }

  // Look up master_customers by Jobber client ID.
  const jobberClientId = quote?.client?.id ?? "";
  const { data: masterCustomer } = jobberClientId
    ? await supabase
        .from("master_customers")
        .select("id, first_name, last_name")
        .eq("organization_id", companyId)
        .eq("jobber_client_id", jobberClientId)
        .maybeSingle()
    : { data: null };

  const jobData: LostQuoteEmailJobData = {
    organizationId: companyId,
    companyId,
    quoteId: quote?.id ?? payload.itemId ?? "",
    customerId: masterCustomer?.id ?? undefined,
    customerName: (quote?.client?.name
      ?? [masterCustomer?.first_name, masterCustomer?.last_name].filter(Boolean).join(" "))
      || undefined,
    quoteAmount: quote?.total ?? undefined,
  };

  // Enqueue Day 7 email — fires 7 days from now.
  const queue = getAutomationQueue();
  await queue.add(JOB_LOST_QUOTE_EMAIL, jobData, { delay: 7 * DAY_MS });

  console.info("[jobber.webhook] Enqueued lost-quote-email job", {
    quoteId: jobData.quoteId,
    companyId,
    quoteStatus,
    delay: "7d",
  });

  return NextResponse.json({ received: true });
}
