import type { Worker } from "bullmq";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/security/secret";
import { createAutomationWorker, createDataKeeperWorker, createSweeperWorker } from "@/lib/queue/worker";
import { getSweeperQueue, getAutomationQueue, isRedisConfigured, JOB_SWEEP_BATCH, JOB_RUN_NIGHTLY_COORDINATOR, DEFAULT_JOB_OPTIONS } from "@/lib/queue/client";
import { getOrgsWithPendingSweep } from "@/lib/data-keeper/sweeper";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Vercel gives Functions up to 300 s on Pro.
// We drain whatever jobs are ready in that window.
export const maxDuration = 300;

// Starts a worker, waits for the queue to drain (or timeoutMs), then closes it.
// worker.run() loops forever — it only exits when closed, so we listen for the
// 'drained' event (queue transitions to empty) and force-close after that.
async function drainWorker(worker: Worker, timeoutMs = 60_000): Promise<void> {
  const runPromise = worker.run().catch(() => {});

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    worker.once("drained", () => {
      clearTimeout(timer);
      resolve();
    });
  });

  await worker.close(true).catch(() => {});
  await runPromise;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (!verifyBearer(authHeader, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isRedisConfigured()) {
    // Loud: every queued automation (invoice nudges, follow-ups, nightly briefs)
    // is skipped until REDIS_URL is set. Surface it instead of a silent 503.
    Sentry.captureMessage(
      "cron.automation skipped — REDIS_URL not configured; queued automations are not running",
      { level: "error", tags: { cron: "automation", phase: "redis_gate" } },
    );
    return NextResponse.json(
      { ok: false, error: "REDIS_URL is not configured — queue processing skipped." },
      { status: 503 },
    );
  }

  // Schedule sweep batch jobs for orgs with unswept records.
  // jobId = `sweep-${orgId}` deduplicates — if an org is already queued it won't be added again.
  try {
    const orgs = await getOrgsWithPendingSweep(50);
    if (orgs.length > 0) {
      const sweeperQueue = getSweeperQueue();
      await Promise.all(
        orgs.map((orgId) =>
          sweeperQueue.add(
            JOB_SWEEP_BATCH,
            { organizationId: orgId },
            { ...DEFAULT_JOB_OPTIONS, jobId: `sweep-${orgId}` },
          ),
        ),
      );
    }
  } catch (err) {
    // Non-fatal: log and continue — the automation workers must still run
    console.warn("[cron.automation] Failed to schedule sweeper batches:", err instanceof Error ? err.message : err);
    Sentry.captureException(err, { tags: { cron: "automation", phase: "schedule_sweeper" } });
  }

  // Schedule nightly coordinator jobs for Pro orgs
  try {
    const supabase = createAdminClient();
    const { data: proOrgs } = await supabase
      .from("companies")
      .select("id"); // tiers collapsed — Vera runs for every company

    if (proOrgs && proOrgs.length > 0) {
      const automationQueue = getAutomationQueue();
      const dateString = new Date().toISOString().slice(0, 10);
      await Promise.all(
        proOrgs.map((org) =>
          automationQueue.add(
            JOB_RUN_NIGHTLY_COORDINATOR,
            { orgId: org.id },
            { ...DEFAULT_JOB_OPTIONS, jobId: `coordinator-${org.id}-${dateString}` },
          ),
        ),
      );
    }
  } catch (err) {
    console.warn("[cron.automation] Failed to schedule nightly coordinator jobs:", err instanceof Error ? err.message : err);
    Sentry.captureException(err, { tags: { cron: "automation", phase: "schedule_coordinator" } });
  }

  const worker = createAutomationWorker();
  const dkWorker = createDataKeeperWorker();
  const swWorker = createSweeperWorker();

  try {
    // Run each worker sequentially, draining available jobs then moving on.
    //
    // All three used to get a flat 60s regardless of load, inside a 300s
    // route budget -- a fixed window that has nothing to do with how many
    // companies are actually queued. The automation worker runs the nightly
    // coordinator: 1 manager call plus up to 8 further LLM calls per
    // company, so at ~20-40s/company and concurrency 2, 60s was only ever
    // enough for a handful of companies before force-closing mid-run and
    // leaving the rest queued for tomorrow (with no per-org log row for the
    // ones that got cut, since that's written after the job completes).
    // Give it most of the route's budget; the other two workers do
    // lighter, faster work per job. 290s total leaves a 10s margin under
    // Vercel's 300s hard cutoff for the response itself to return.
    await drainWorker(worker, 220_000);
    await drainWorker(dkWorker, 40_000);
    await drainWorker(swWorker, 30_000);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron.automation] Worker run failed", message);
    Sentry.captureException(err, { tags: { cron: "automation", phase: "worker_run" } });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
