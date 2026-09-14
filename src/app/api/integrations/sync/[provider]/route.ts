import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import { getSyncer } from "@/lib/integrations/registry";
import { refreshIntegrationToken } from "@/lib/integrations/token";
import { decryptIntegrationRow } from "@/lib/integrations/token-crypto";
import { rateLimit } from "@/lib/rate-limit";
import { insertNotification } from "@/lib/notifications";

// Import all syncers so they self-register via registerSyncer().
import "@/lib/integrations/quickbooks";
import "@/lib/integrations/hubspot";
import "@/lib/integrations/jobber";
import "@/lib/integrations/square";
import "@/lib/integrations/stripe";
import { commitSyncSessions } from "@/lib/integrations/commit-sync";

// A first sync for an established business pulls up to a thousand records per
// object type and then writes them. The platform's default timeout cut that off
// partway through, leaving a half-imported workspace and no sign of why.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!await rateLimit(`sync:${companyId}`)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a moment." },
      { status: 429 },
    );
  }

  const syncer = getSyncer(provider);
  if (!syncer) {
    return NextResponse.json(
      { error: `Unknown provider: ${provider}` },
      { status: 404 },
    );
  }

  const { data: integration, error: intError } = await supabase
    .from("integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", provider)
    .maybeSingle();

  if (intError || !integration) {
    return NextResponse.json(
      { error: "Integration not connected" },
      { status: 400 },
    );
  }

  try {
    await refreshIntegrationToken(supabase, decryptIntegrationRow(integration));

    const { data: freshIntegration, error: freshError } = await supabase
      .from("integrations")
      .select("*")
      .eq("id", integration.id)
      .maybeSingle();

    if (freshError || !freshIntegration) {
      return NextResponse.json({ error: "Integration no longer exists" }, { status: 400 });
    }

    const startedAt = new Date().toISOString();
    const result = await syncer.sync(supabase, companyId, decryptIntegrationRow(freshIntegration));

    // Connecting an integration is the user opting in, so what it pulls lands in
    // the app rather than sitting in a review queue they'd have to go find.
    const committed = await commitSyncSessions({
      supabase,
      companyId,
      sessionIds: result.sessionIds,
    });

    const finishedAt = new Date().toISOString();

    const contactsTouched = result.customersCreated + result.customersUpdated;
    const recordsImported = committed.created + committed.updated;
    const hadTrouble = committed.failed > 0 || committed.errors.length > 0;

    await supabase.from("sync_runs").insert({
      company_id: companyId,
      sync_connection_id: null,
      status: hadTrouble ? "completed_with_errors" : "success",
      records_seen: result.recordsStaged + contactsTouched,
      records_created: result.customersCreated + committed.created,
      records_updated: result.customersUpdated + committed.updated,
      records_failed: committed.failed,
      started_at: startedAt,
      finished_at: finishedAt,
      error_message: committed.errors.length ? committed.errors.join("; ") : null,
      metadata: { provider, session_ids: result.sessionIds },
    });

    const summary = [
      `${contactsTouched} contact${contactsTouched === 1 ? "" : "s"}`,
      `${recordsImported} record${recordsImported === 1 ? "" : "s"}`,
    ].join(", ");

    await insertNotification(
      supabase,
      companyId,
      "sync_complete",
      `${provider} sync complete`,
      hadTrouble
        ? `${summary} imported, ${committed.failed} could not be imported`
        : `${summary} imported`,
    );
    revalidatePath("/workspace");
    revalidatePath("/customers");
    revalidatePath("/imports");
    revalidatePath("/crm");
    revalidatePath("/sales");
    return NextResponse.json({
      ok: true,
      ...result,
      contactsTouched,
      recordsImported,
      recordsFailed: committed.failed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";

    // Without this a failed sync left no trace anywhere the user can see -- the
    // Imports page showed the last successful run and nothing else.
    await supabase.from("sync_runs").insert({
      company_id: companyId,
      sync_connection_id: null,
      status: "error",
      records_seen: 0,
      records_created: 0,
      records_updated: 0,
      records_failed: 0,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      error_message: message,
      metadata: { provider },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
