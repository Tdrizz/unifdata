import { runNightlyCoordinator } from "@/lib/agents/nightly-coordinator";

export type NightlyCoordinatorJobData = {
  orgId: string;
};

export async function processNightlyCoordinatorJob(
  data: NightlyCoordinatorJobData,
): Promise<void> {
  await runNightlyCoordinator(data.orgId);
}
