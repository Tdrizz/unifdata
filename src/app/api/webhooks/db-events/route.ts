import { NextResponse } from "next/server";
import {
  JOB_POST_COMPLETION_OUTREACH,
  JOB_NEW_CONTACT_FOLLOWUP,
  DEFAULT_JOB_OPTIONS,
} from "@/lib/queue/client";
import { enqueueAutomationJob } from "@/lib/queue/enqueue";

export const runtime = "nodejs";

// Supabase sends webhook events as POST with a JSON body.
// Protect with a shared secret stored in SUPABASE_WEBHOOK_SECRET.
export async function POST(request: Request) {
  const secret = process.env.SUPABASE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const headerSecret = request.headers.get("x-webhook-secret");
  if (headerSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const table = String(body.table ?? "");
  const type = String(body.type ?? "");
  const record = (body.record ?? {}) as Record<string, unknown>;
  const oldRecord = (body.old_record ?? {}) as Record<string, unknown>;

  let enqueued = true;

  // Job marked complete → draft post-completion outreach
  if (table === "jobs" && type === "UPDATE") {
    const newStatus = String(record.status ?? "").toLowerCase();
    const oldStatus = String(oldRecord.status ?? "").toLowerCase();
    const completedStatuses = ["completed", "complete", "done", "finished"];
    if (completedStatuses.includes(newStatus) && !completedStatuses.includes(oldStatus)) {
      const orgId = String(record.company_id ?? "");
      const jobId = String(record.id ?? "");
      const customerId = String(record.customer_id ?? "");
      const serviceType = String(record.service_type ?? record.job_type ?? "service");
      const customerName = String(record.customer_name ?? "");

      if (orgId && customerId) {
        const ok = await enqueueAutomationJob(
          JOB_POST_COMPLETION_OUTREACH,
          { orgId, jobId, customerId, customerName, serviceType },
          { ...DEFAULT_JOB_OPTIONS, jobId: `post-completion-${jobId}` },
          { org: orgId, detail: { event: "job_completed", jobId } },
        );
        if (!ok) enqueued = false;
      }
    }
  }

  // New customer added → draft new contact follow-up
  if (table === "customers" && type === "INSERT") {
    const orgId = String(record.company_id ?? "");
    const customerId = String(record.id ?? "");
    const customerName = String(record.name ?? record.full_name ?? "");

    if (orgId && customerId) {
      const ok = await enqueueAutomationJob(
        JOB_NEW_CONTACT_FOLLOWUP,
        { orgId, customerId, customerName },
        { ...DEFAULT_JOB_OPTIONS, jobId: `new-contact-${customerId}` },
        { org: orgId, detail: { event: "contact_created", customerId } },
      );
      if (!ok) enqueued = false;
    }
  }

  // Signal the failure so the sender (and our uptime view) sees a dropped
  // automation instead of a silent 200. Sentry has already captured the detail.
  if (!enqueued) {
    return NextResponse.json({ ok: false, queued: false }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
