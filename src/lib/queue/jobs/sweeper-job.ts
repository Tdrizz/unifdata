import { runSweeperBatch } from "@/lib/data-keeper/sweeper";

export type SweeperJobData = {
  organizationId: string;
};

export async function processSweeperJob(data: SweeperJobData) {
  const result = await runSweeperBatch(data.organizationId);
  return result;
}
