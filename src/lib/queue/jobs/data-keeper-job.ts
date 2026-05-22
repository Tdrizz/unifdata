import { runConfidenceEngine } from "@/lib/data-keeper/confidence-engine";
import { executeDecision } from "@/lib/data-keeper/state-engine";
import type { DataKeeperJobData } from "@/lib/data-keeper/types";

export async function processDataKeeperJob(data: DataKeeperJobData): Promise<{ action: string }> {
  const { organizationId, sourceSystem, payload } = data;

  const decision = await runConfidenceEngine(organizationId, payload, sourceSystem);
  await executeDecision(organizationId, decision, sourceSystem);

  return { action: decision.action };
}
