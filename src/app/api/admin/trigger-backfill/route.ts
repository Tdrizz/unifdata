import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDataKeeperQueue, JOB_EMBEDDING_BACKFILL, DEFAULT_JOB_OPTIONS } from "@/lib/queue/client";
import type { EmbeddingBackfillJobData } from "@/lib/queue/jobs/embedding-backfill-job";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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
}
