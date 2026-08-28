import { createAdminClient } from "@/lib/supabase/admin";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { compileTelemetry } from "./telemetry";
import { runManagerAgent } from "./manager-agent";
import { runOutreachWorker } from "./workers/outreach-worker";
import { runRevenueWorker } from "./workers/revenue-worker";
import { runDataQualityWorker } from "./workers/data-quality-worker";
import { runAlertFormatterWorker } from "./workers/alert-formatter-worker";
import { runChurnSignalAgent } from "./customer-health-agent";
import { createNightlyTrace, startSpan, endSpan, flushLangfuse } from "@/lib/observability/tracing";
import { isOutreachAutopilot } from "@/lib/feature-gates";

export async function runNightlyCoordinator(orgId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, business_sector, tier, preferences")
    .eq("id", orgId)
    .single();

  if (!company) return;

  const profile = getIndustryProfile(company.business_sector);

  const date = new Date().toISOString().split("T")[0];
  const ctx = createNightlyTrace(orgId, date);

  let eventsFireable = 0;
  let runError: string | undefined;
  let assessment: string | null = null;

  try {
    const telemetrySpan = startSpan(ctx, "telemetry-compilation", { orgId });
    const snapshot = await compileTelemetry(
      orgId,
      supabase,
      company.preferences as Record<string, unknown> | undefined,
    );
    endSpan(telemetrySpan, { signalCount: Object.keys(snapshot).length });

    let blueprint;
    try {
      blueprint = await runManagerAgent(snapshot, profile, company as { name: string }, ctx);
    } catch (err) {
      const raw = (err as { rawResponse?: string }).rawResponse ?? String(err);
      ctx.trace.update({ metadata: { managerError: raw.slice(0, 500) } });
      await supabase.from("agent_logs").insert({
        organization_id: orgId,
        agent_name: "manager-agent",
        error: raw.slice(0, 2000),
      });
      // The manager failing is this run's most common failure mode (it was
      // the entire cause of a 100%-error streak in production), and this
      // early return used to skip the nightly-coordinator row written at
      // the end of the function -- so the admin health page's "Nightly Runs
      // success rate" excluded every night this happened from its
      // denominator entirely, rather than counting it as a failure. A run
      // that never produced a review is a failed run.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("agent_logs").insert({
        organization_id: orgId,
        agent_name: "nightly-coordinator",
        signals_checked: 6,
        events_fired: 0,
        autopilot: isOutreachAutopilot(company as { preferences?: Record<string, unknown> }),
        error: `manager-agent failed: ${raw.slice(0, 1900)}`,
      });
      return;
    }

    assessment = blueprint.assessment;

    let churnError: string | undefined;
    const churnTask = runChurnSignalAgent(orgId, supabase).catch((err: unknown) => {
      churnError = err instanceof Error ? err.message : String(err);
    });

    const workerResults = await Promise.allSettled(
      blueprint.tasks.map(async (task) => {
        switch (task.worker) {
          case "outreach":
            await runOutreachWorker(
              task.payload as Parameters<typeof runOutreachWorker>[0],
              company as { id: string; name: string; preferences?: Record<string, unknown> },
              supabase,
              profile,
              ctx,
            );
            break;
          case "revenue":
            await runRevenueWorker(snapshot, orgId, supabase, profile, ctx);
            break;
          case "data_quality":
            await runDataQualityWorker(
              company as { id: string; preferences?: Record<string, unknown> },
              supabase,
              ctx,
            );
            break;
          case "alert_formatter":
            await runAlertFormatterWorker(
              task.payload as Record<string, unknown>,
              orgId,
              supabase,
              profile,
              ctx,
            );
            break;
        }
      }),
    );

    await churnTask;
    eventsFireable = workerResults.filter((r) => r.status === "fulfilled").length;
    const failures = workerResults
      .filter((r) => r.status === "rejected")
      .map((r) => (r as PromiseRejectedResult).reason?.message ?? "unknown error");

    if (churnError) failures.push(`churn: ${churnError}`);

    if (failures.length > 0) {
      runError = failures.join("; ").slice(0, 2000);
    }
  } catch (err) {
    runError = err instanceof Error ? err.message : String(err);
    ctx.trace.update({ metadata: { error: runError } });
  } finally {
    await flushLangfuse();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("agent_logs").insert({
    organization_id: orgId,
    agent_name: "nightly-coordinator",
    signals_checked: 6,
    events_fired: eventsFireable,
    autopilot: isOutreachAutopilot(company as { preferences?: Record<string, unknown> }),
    error: runError ?? null,
    assessment,
  });
}
