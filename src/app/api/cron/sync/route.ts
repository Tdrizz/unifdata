import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSyncer } from "@/lib/integrations/registry";
import { refreshIntegrationToken } from "@/lib/integrations/token";

// Import all syncers so they self-register via registerSyncer().
import "@/lib/integrations/quickbooks";
import "@/lib/integrations/hubspot";
import "@/lib/integrations/jobber";
import "@/lib/integrations/square";
import "@/lib/integrations/stripe";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch all active integrations across all companies
  const { data: integrations, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: {
    companyId: string;
    provider: string;
    status: "ok" | "error" | "skipped";
    recordsSeen: number;
    error: string | null;
  }[] = [];

  for (const integration of integrations ?? []) {
    const syncer = getSyncer(integration.provider);
    if (!syncer) {
      // Provider has no registered syncer — skip silently
      results.push({
        companyId: integration.company_id,
        provider: integration.provider,
        status: "skipped",
        recordsSeen: 0,
        error: null,
      });
      continue;
    }

    const startedAt = new Date().toISOString();

    try {
      await refreshIntegrationToken(supabase as any, integration);

      const { data: freshIntegration } = await supabase
        .from("integrations")
        .select("*")
        .eq("id", integration.id)
        .single();

      const result = await syncer.sync(
        supabase as any,
        integration.company_id,
        freshIntegration!,
      );

      await supabase.from("sync_runs").insert({
        company_id: integration.company_id,
        sync_connection_id: null,
        status: "success",
        records_seen: result.recordsStaged,
        records_created: result.customersCreated,
        records_updated: result.customersUpdated,
        records_failed: 0,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        error_message: null,
        metadata: { provider: integration.provider },
      });

      results.push({
        companyId: integration.company_id,
        provider: integration.provider,
        status: "ok",
        recordsSeen: result.recordsStaged,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await supabase.from("sync_runs").insert({
        company_id: integration.company_id,
        sync_connection_id: null,
        status: "error",
        records_seen: 0,
        records_created: 0,
        records_updated: 0,
        records_failed: 0,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        error_message: message,
        metadata: { provider: integration.provider },
      });

      results.push({
        companyId: integration.company_id,
        provider: integration.provider,
        status: "error",
        recordsSeen: 0,
        error: message,
      });
    }
  }

  // Check for overdue follow-ups and insert notifications
  const nowStr = new Date().toISOString();
  const oneDayAgoStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: overdueFollowUps } = await supabase
    .from("follow_ups")
    .select("id, company_id, message")
    .lt("due_date", nowStr)
    .not("status", "in", '("completed","cancelled")')
    .limit(100);

  for (const followUp of overdueFollowUps ?? []) {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("company_id", followUp.company_id)
      .eq("type", "follow_up_overdue")
      .like("body", `%${followUp.id}%`)
      .gte("created_at", oneDayAgoStr);

    if ((count ?? 0) === 0) {
      await supabase.from("notifications").insert({
        company_id: followUp.company_id,
        type: "follow_up_overdue",
        title: "Overdue follow-up",
        body: `"${followUp.message ?? "Follow-up"}" is past its due date. ID: ${followUp.id}`,
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
