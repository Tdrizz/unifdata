import { createAdminClient } from "@/lib/supabase/admin";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { isPro } from "@/lib/feature-gates";
import { compileTelemetry } from "./telemetry";
import { runManagerAgent } from "./manager-agent";
import { runOutreachWorker } from "./workers/outreach-worker";
import { runRevenueWorker } from "./workers/revenue-worker";
import { runDataQualityWorker } from "./workers/data-quality-worker";
import { runAlertFormatterWorker } from "./workers/alert-formatter-worker";

export async function runNightlyCoordinator(orgId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, business_sector, tier, preferences")
    .eq("id", orgId)
    .single();

  if (!company || !isPro(company as { tier: string })) return;

  const profile = getIndustryProfile(company.business_sector);

  let eventsFireable = 0;
  let runError: string | undefined;

  try {
    const snapshot = await compileTelemetry(orgId, supabase);

    let blueprint;
    try {
      blueprint = await runManagerAgent(snapshot, profile, company as { name: string });
    } catch (err) {
      const raw = (err as { rawResponse?: string }).rawResponse ?? String(err);
      await supabase.from("agent_logs").insert({
        organization_id: orgId,
        agent_name: "manager-agent",
        error: raw.slice(0, 2000),
      });
      return;
    }

    const workerResults = await Promise.allSettled(
      blueprint.tasks.map(async (task) => {
        switch (task.worker) {
          case "outreach":
            await runOutreachWorker(
              task.payload as Parameters<typeof runOutreachWorker>[0],
              company as { id: string; name: string; preferences?: Record<string, unknown> },
              supabase,
              profile,
            );
            break;
          case "revenue":
            await runRevenueWorker(snapshot, orgId, supabase, profile);
            break;
          case "data_quality":
            await runDataQualityWorker(
              company as { id: string; preferences?: Record<string, unknown> },
              supabase,
            );
            break;
          case "alert_formatter":
            await runAlertFormatterWorker(
              task.payload as Record<string, unknown>,
              orgId,
              supabase,
              profile,
            );
            break;
        }
      }),
    );

    eventsFireable = workerResults.filter((r) => r.status === "fulfilled").length;
    const failures = workerResults
      .filter((r) => r.status === "rejected")
      .map((r) => (r as PromiseRejectedResult).reason?.message ?? "unknown error");

    if (failures.length > 0) {
      runError = failures.join("; ").slice(0, 2000);
    }
  } catch (err) {
    runError = err instanceof Error ? err.message : String(err);
  }

  await supabase.from("agent_logs").insert({
    organization_id: orgId,
    agent_name: "nightly-coordinator",
    signals_checked: 6,
    events_fired: eventsFireable,
    autopilot:
      (company.preferences as Record<string, unknown> | null)?.autopilot === true,
    error: runError ?? null,
  });
}
