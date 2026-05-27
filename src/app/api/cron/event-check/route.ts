import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAutomationQueue,
  JOB_RECORD_NUDGER,
  DEFAULT_JOB_OPTIONS,
} from "@/lib/queue/client";
import { createAutomationWorker } from "@/lib/queue/worker";
import type { Worker } from "bullmq";

export const runtime = "nodejs";
export const maxDuration = 60;

const INVOICE_AGE_THRESHOLDS = [14, 30, 45, 60];

async function drainWorker(worker: Worker, timeoutMs = 45_000): Promise<void> {
  const runPromise = worker.run().catch(() => {});
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    worker.once("drained", () => { clearTimeout(timer); resolve(); });
  });
  await worker.close(true).catch(() => {});
  await runPromise;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const queue = getAutomationQueue();
  const today = new Date();
  const dateTag = today.toISOString().slice(0, 10);

  // Queue Record Nudger for all Pro orgs (stale jobs + overdue follow-ups)
  const { data: proOrgs } = await supabase
    .from("companies")
    .select("id")
    .eq("tier", "pro");

  if (proOrgs && proOrgs.length > 0) {
    await Promise.all(
      proOrgs.map((org) =>
        queue.add(
          JOB_RECORD_NUDGER,
          { orgId: org.id },
          { ...DEFAULT_JOB_OPTIONS, jobId: `nudger-${org.id}-${dateTag}` },
        ),
      ),
    );
  }

  // Invoice age thresholds: queue Record Nudger for any org with unpaid invoices
  // that just hit 14, 30, 45, or 60 days old today
  const agedOrgIds = new Set<string>();
  await Promise.all(
    INVOICE_AGE_THRESHOLDS.map(async (days) => {
      const targetDate = new Date(today.getTime() - days * 86400000)
        .toISOString()
        .slice(0, 10);
      const { data: aged } = await supabase
        .from("sales")
        .select("company_id")
        .neq("payment_status", "paid")
        .eq("sale_date", targetDate);
      if (aged) {
        for (const row of aged) agedOrgIds.add(row.company_id as string);
      }
    }),
  );

  // Deduplicate against proOrgs already queued above
  const proOrgSet = new Set((proOrgs ?? []).map((o) => o.id));
  const agedNonPro = [...agedOrgIds].filter((id) => !proOrgSet.has(id));

  await Promise.all(
    agedNonPro.map((orgId) =>
      queue.add(
        JOB_RECORD_NUDGER,
        { orgId },
        { ...DEFAULT_JOB_OPTIONS, jobId: `nudger-aged-invoice-${orgId}-${dateTag}` },
      ),
    ),
  );

  const worker = createAutomationWorker();
  try {
    await drainWorker(worker);
    return NextResponse.json({
      ok: true,
      proOrgs: proOrgs?.length ?? 0,
      agedInvoiceOrgs: agedOrgIds.size,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
