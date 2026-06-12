import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDataKeeperQueue, isRedisConfigured, JOB_EMBEDDING_BACKFILL, DEFAULT_JOB_OPTIONS } from "@/lib/queue/client";
import type { EmbeddingBackfillJobData } from "@/lib/queue/jobs/embedding-backfill-job";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isRedisConfigured()) {
      return NextResponse.json(
        { ok: false, error: "REDIS_URL is not configured — queue processing skipped." },
        { status: 503 },
      );
    }

    const supabase = createAdminClient();
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id")
      .eq("status", "active");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const queue = getDataKeeperQueue();
    const tables = ["customers", "jobs", "sales"] as const;
    let enqueued = 0;

    for (const company of companies ?? []) {
      for (const table of tables) {
        const jobData: EmbeddingBackfillJobData = { companyId: company.id, table };
        await queue.add(JOB_EMBEDDING_BACKFILL, jobData, {
          ...DEFAULT_JOB_OPTIONS,
          jobId: `backfill-${company.id}-${table}`,
        });
        enqueued++;
      }
    }

    return NextResponse.json({ ok: true, enqueued });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (err instanceof Error && (err as any).digest?.startsWith("NEXT_REDIRECT")) throw err;
    console.error("[trigger-backfill]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
