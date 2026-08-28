import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setOrgScope } from "@/lib/supabase/org-scope";
import { validateQuickBooksSignature } from "@/lib/webhook-validation";
import { JOB_OVERDUE_INVOICE } from "@/lib/queue/client";
import { enqueueAutomationJob } from "@/lib/queue/enqueue";
import type { OverdueInvoiceJobData } from "@/lib/queue/jobs/overdue-invoice";
import { QuickBooksWebhookSchema } from "@/lib/webhook-schemas";

export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;

// QuickBooks webhook payload shape (relevant fields only).
type QBEntity = {
  name: string;
  id: string;
  operation: string;
  lastUpdated: string;
};

type QBEventNotification = {
  realmId: string;
  dataChangeEvent: {
    entities: QBEntity[];
  };
};

type QBWebhookPayload = {
  eventNotifications: QBEventNotification[];
};

export async function POST(request: Request) {
  const intuitSignature = request.headers.get("intuit-signature") ?? "";
  const rawBody = await request.text();

  const verifierToken = process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN;
  if (!verifierToken) {
    console.error("[quickbooks.webhook] Missing QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN");
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  if (!validateQuickBooksSignature(verifierToken, rawBody, intuitSignature)) {
    console.warn("[quickbooks.webhook] Signature validation failed");
    return NextResponse.json(
      { error: "Webhook Security Validation Failed: Unauthorized Signature Forgery." },
      { status: 401 },
    );
  }

  let payload: QBWebhookPayload;
  try {
    const parsed = JSON.parse(rawBody);
    payload = QuickBooksWebhookSchema.parse(parsed) as QBWebhookPayload;
  } catch (e) {
    console.error("[quickbooks.webhook] Payload validation failed", e);
    return NextResponse.json({ error: "Invalid JSON or schema validation failed." }, { status: 400 });
  }

  const supabase = createAdminClient();
  let enqueued = true;

  for (const notification of payload.eventNotifications ?? []) {
    const realmId = notification.realmId;
    const entities = notification.dataChangeEvent?.entities ?? [];

    // Find the company linked to this QuickBooks realm.
    const { data: integration } = await supabase
      .from("integrations")
      .select("company_id")
      .eq("provider", "quickbooks")
      .contains("metadata", { realm_id: realmId })
      .maybeSingle();

    if (!integration) continue;

    const companyId = integration.company_id as string;
    await setOrgScope(supabase, companyId);

    for (const entity of entities) {
      if (entity.name !== "Invoice") continue;

      // Resolve the local sale via its external link (external_id = QB invoice Id).
      // The stored service_type holds a DocNumber, so a service_type match is unreliable.
      const { data: link } = await supabase
        .from("external_record_links")
        .select("internal_id")
        .eq("company_id", companyId)
        .eq("provider", "quickbooks")
        .eq("internal_table", "sales")
        .eq("external_id", entity.id)
        .maybeSingle();
      if (!link) continue;
      const saleId = link.internal_id as string;

      // Stamp source_system and last_synced_at on the linked sale.
      await supabase
        .from("sales")
        .update({ source_system: "quickbooks", last_synced_at: new Date().toISOString() })
        .eq("id", saleId)
        .eq("company_id", companyId);

      if (entity.operation !== "Update") continue;

      // Is this invoice recorded as unpaid/overdue locally?
      const { data: sale } = await supabase
        .from("sales")
        .select("id, payment_status, amount, contact_id")
        .eq("id", saleId)
        .eq("company_id", companyId)
        .in("payment_status", ["Unpaid", "unpaid", "Overdue", "overdue"])
        .maybeSingle();

      if (!sale) continue;

      const jobData: OverdueInvoiceJobData = {
        organizationId: companyId,
        companyId,
        invoiceId: entity.id,
        customerId: (sale.contact_id as string | null) ?? undefined,
        invoiceAmount: sale.amount as number | undefined,
      };

      // Delay 24 hours before the SMS fires — gives the customer time to pay.
      const ok = await enqueueAutomationJob(
        JOB_OVERDUE_INVOICE,
        jobData,
        { delay: DAY_MS },
        { org: companyId, detail: { event: "overdue_invoice", invoiceId: entity.id } },
      );
      if (!ok) enqueued = false;

      console.info("[quickbooks.webhook] Enqueued overdue-invoice job", {
        invoiceId: entity.id,
        companyId,
        delay: "24h",
        enqueued: ok,
      });

      // ROI detection: check if a prior approved agent_draft to this customer
      // may have prompted the payment. agent_drafts.record_id is always the
      // customer/contact id an outreach draft was written for (see
      // outreach-worker.ts) -- it is never a sale id, so matching against
      // sale.id here could never find a row, and "AI recovered this month"
      // was structurally always $0. Match on the contact instead: an
      // approved outreach draft to this customer in the last 30 days,
      // followed by their previously-unpaid invoice clearing, is the
      // available signal.
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: approvedDraft } = sale.contact_id
        ? await supabase
            .from("agent_drafts")
            .select("id")
            .eq("organization_id", companyId)
            .eq("record_id", sale.contact_id as string)
            .eq("status", "approved")
            .gte("created_at", thirtyDaysAgo)
            .maybeSingle()
        : { data: null };

      if (approvedDraft) {
        await supabase.from("roi_events").insert({
          organization_id: companyId,
          event_type: "invoice_paid_after_reminder",
          amount_recovered: sale.amount,
          record_id: sale.id,
          triggered_by: "outreach-worker",
        });
      }
    }
  }

  // 503 (not 200) on a dropped enqueue so QuickBooks retries the notification;
  // Sentry has already captured the reason.
  if (!enqueued) {
    return NextResponse.json({ received: true, queued: false }, { status: 503 });
  }

  return NextResponse.json({ received: true });
}
