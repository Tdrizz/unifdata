import { runPatternSpotterWorker } from "@/lib/agents/workers/pattern-spotter-worker";
import { createAdminClient } from "@/lib/supabase/admin";

export type PatternSpotterJobData = {
  orgId: string;
};

export async function processPatternSpotterJob(data: PatternSpotterJobData): Promise<void> {
  const supabase = createAdminClient();
  await runPatternSpotterWorker(data.orgId, supabase);
}
