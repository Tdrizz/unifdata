import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setOrgScope } from "@/lib/supabase/org-scope";
import { validateQuickBooksSignature } from "@/lib/webhook-validation";
import { getAutomationQueue, JOB_OVERDUE_INVOICE } from "@/lib/queue/client";
import type { OverdueInvoiceJobData } from "@/lib/queue/jobs/overdue-invoice";

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
    payload = QuickBooksWebhookSchema.parse(parsed);
  } catch (e) {
    console.error("[quickbooks.webhook] Payload validation failed", e);
    return NextResponse.json({ error: "Invalid JSON or schema validation failed." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const queue = getAutomationQueue();

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
      if (entity.name !== "Invoice" || entity.operation !== "Update") continue;

      // Check the local sales table: is this invoice recorded as unpaid/overdue?
      const { data: sale } = await supabase
        .from("sales")
        .select("id, payment_status, amount, customer_id")
        .eq("company_id", companyId)
        .or(`service_type.ilike.%${entity.id}%`)
        .in("payment_status", ["Unpaid", "unpaid", "Overdue", "overdue"])
        .maybeSingle();

      if (!sale) continue;

      // Look up master_customers to attach the customer ID at enqueue time.
      const { data: masterCustomer } = sale.customer_id
        ? await supabase
            .from("master_customers")
            .select("id")
            .eq("organization_id", companyId)
            .eq("quickbooks_customer_id", entity.id)
            .maybeSingle()
        : { data: null };

      const jobData: OverdueInvoiceJobData = {
        organizationId: companyId,
        companyId,
        invoiceId: entity.id,
        customerId: masterCustomer?.id ?? undefined,
        invoiceAmount: sale.amount as number | undefined,
      };

      // Delay 24 hours before the SMS fires — gives the customer time to pay.
      await queue.add(JOB_OVERDUE_INVOICE, jobData, { delay: DAY_MS });

      console.info("[quickbooks.webhook] Enqueued overdue-invoice job", {
        invoiceId: entity.id,
        companyId,
        delay: "24h",
      });
    }
  }

  return NextResponse.json({ received: true });
}
