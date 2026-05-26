import { runVolumeAnticipatorWorker } from "@/lib/agents/workers/volume-anticipator-worker";
import { createAdminClient } from "@/lib/supabase/admin";

export type VolumeAnticipatorJobData = {
  orgId: string;
};

export async function processVolumeAnticipatorJob(data: VolumeAnticipatorJobData): Promise<void> {
  const supabase = createAdminClient();
  await runVolumeAnticipatorWorker(data.orgId, supabase);
}
