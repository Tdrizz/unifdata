import { NextResponse } from "next/server";
import { createAutomationWorker, createDataKeeperWorker, createSweeperWorker } from "@/lib/queue/worker";
import { getSweeperQueue, JOB_SWEEP_BATCH, DEFAULT_JOB_OPTIONS } from "@/lib/queue/client";
import { getOrgsWithPendingSweep } from "@/lib/data-keeper/sweeper";

export const runtime = "nodejs";

// Vercel gives Functions up to 300 s on Pro.
// We drain whatever jobs are ready in that window.
export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Schedule sweep batch jobs for orgs with unswept records.
  // jobId = `sweep:${orgId}` deduplicates — if an org is already queued it won't be added again.
  try {
    const orgs = await getOrgsWithPendingSweep(50);
    if (orgs.length > 0) {
      const sweeperQueue = getSweeperQueue();
      await Promise.all(
        orgs.map((orgId) =>
          sweeperQueue.add(
            JOB_SWEEP_BATCH,
            { organizationId: orgId },
            { ...DEFAULT_JOB_OPTIONS, jobId: `sweep:${orgId}` },
          ),
        ),
      );
    }
  } catch (err) {
    // Non-fatal: log and continue — the automation workers must still run
    console.warn("[cron.automation] Failed to schedule sweeper batches:", err instanceof Error ? err.message : err);
  }

  const worker = createAutomationWorker();
  const dkWorker = createDataKeeperWorker();
  const swWorker = createSweeperWorker();

  try {
    await worker.run();
    await dkWorker.run();
    await swWorker.run();

    // run() processes all currently-available (non-delayed) jobs and resolves
    // when the queue is momentarily empty. Delayed jobs stay in Redis until
    // their delay elapses and will be picked up by the next cron invocation.
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron.automation] Worker run failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    await worker.close();
    await dkWorker.close();
    await swWorker.close();
  }
}
