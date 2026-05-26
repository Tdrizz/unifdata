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

  // Get all Pro orgs
  const { data: proOrgs } = await supabase
    .from("companies")
    .select("id")
    .eq("tier", "pro");

  if (proOrgs && proOrgs.length > 0) {
    const queue = getAutomationQueue();
    const hourTag = new Date().toISOString().slice(0, 10); // changes daily

    await Promise.all(
      proOrgs.map((org) =>
        queue.add(
          JOB_RECORD_NUDGER,
          { orgId: org.id },
          { ...DEFAULT_JOB_OPTIONS, jobId: `nudger-${org.id}-${hourTag}` },
        ),
      ),
    );
  }

  const worker = createAutomationWorker();
  try {
    await drainWorker(worker);
    return NextResponse.json({ ok: true, orgs: proOrgs?.length ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
