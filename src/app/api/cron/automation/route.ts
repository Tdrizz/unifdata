import { NextResponse } from "next/server";
import { createAutomationWorker } from "@/lib/queue/worker";

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

  const worker = createAutomationWorker();

  try {
    await worker.run();

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
  }
}
