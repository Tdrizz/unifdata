import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAutomationQueue,
  JOB_PATTERN_SPOTTER,
  JOB_VOLUME_ANTICIPATOR,
  DEFAULT_JOB_OPTIONS,
} from "@/lib/queue/client";
import { createAutomationWorker } from "@/lib/queue/worker";
import type { Worker } from "bullmq";

export const runtime = "nodejs";
export const maxDuration = 300;

async function drainWorker(worker: Worker, timeoutMs = 240_000): Promise<void> {
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
  const { data: proOrgs } = await supabase
    .from("companies")
    .select("id")
    .eq("tier", "pro");

  if (proOrgs && proOrgs.length > 0) {
    const queue = getAutomationQueue();
    const monthTag = new Date().toISOString().slice(0, 7); // YYYY-MM

    await Promise.all(
      proOrgs.flatMap((org) => [
        queue.add(
          JOB_PATTERN_SPOTTER,
          { orgId: org.id },
          { ...DEFAULT_JOB_OPTIONS, jobId: `pattern-${org.id}-${monthTag}` },
        ),
        queue.add(
          JOB_VOLUME_ANTICIPATOR,
          { orgId: org.id },
          { ...DEFAULT_JOB_OPTIONS, jobId: `volume-${org.id}-${monthTag}` },
        ),
      ]),
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
