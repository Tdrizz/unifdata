import { runRecordNudgerWorker } from "@/lib/agents/workers/record-nudger-worker";
import { createAdminClient } from "@/lib/supabase/admin";

export type RecordNudgerJobData = {
  orgId: string;
};

export async function processRecordNudgerJob(data: RecordNudgerJobData): Promise<void> {
  const supabase = createAdminClient();
  await runRecordNudgerWorker(data.orgId, supabase);
}
