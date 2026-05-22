import { createAdminClient } from "@/lib/supabase/admin";
import { setOrgScope } from "@/lib/supabase/org-scope";
import { runConfidenceEngine } from "./confidence-engine";
import { executeDecision } from "./state-engine";
import type { InboundPayload } from "./types";
import type { TablesUpdate } from "@/types/db";

const BATCH_SIZE = 20;

type SweepStatus = "swept" | "proposed";

type SweeperResult = {
  processed: number;
  proposed: number;
  skipped: number;
};

async function markSwept(
  supabase: ReturnType<typeof createAdminClient>,
  recordId: string,
  organizationId: string,
  status: SweepStatus,
) {
  const payload: TablesUpdate<"master_customers"> = {
    keeper_sweep_status: status,
    keeper_last_swept_at: new Date().toISOString(),
  };
  await supabase
    .from("master_customers")
    .update(payload)
    .eq("id", recordId)
    .eq("organization_id", organizationId);
}

export async function runSweeperBatch(
  organizationId: string,
): Promise<SweeperResult> {
  const supabase = createAdminClient();
  await setOrgScope(supabase, organizationId);

  // Fetch a batch of unswept records, lowest health score first (most likely to benefit).
  const { data: records } = await supabase
    .from("master_customers")
    .select("id, first_name, last_name, primary_email, primary_phone")
    .eq("organization_id", organizationId)
    .or("keeper_sweep_status.is.null,keeper_sweep_status.eq.pending")
    .order("data_health_score", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (!records || records.length === 0) {
    return { processed: 0, proposed: 0, skipped: 0 };
  }

  let proposed = 0;
  let skipped = 0;

  for (const record of records) {
    // Skip records with no usable identity fields — nothing to match on
    if (!record.first_name && !record.last_name && !record.primary_email && !record.primary_phone) {
      await markSwept(supabase, record.id, organizationId, "swept");
      skipped++;
      continue;
    }

    const virtualPayload: InboundPayload = {
      firstName: record.first_name ?? undefined,
      lastName: record.last_name ?? undefined,
      email: record.primary_email ?? undefined,
      phone: record.primary_phone ?? undefined,
      sourceSystem: "sweeper",
    };

    try {
      const decision = await runConfidenceEngine(
        organizationId,
        virtualPayload,
        "sweeper",
        { excludeId: record.id, sweepMode: true },
      );

      if (decision.action === "CREATE_PROPOSAL") {
        // Tag the proposal as sweep-sourced so the UI can render it differently
        decision.normalizedData.extractedMetadata = {
          ...decision.normalizedData.extractedMetadata,
          sweep_source_id: record.id,
          sweep_mode: "true",
        };

        await executeDecision(organizationId, decision, "sweeper");
        await markSwept(supabase, record.id, organizationId, "proposed");
        proposed++;
      } else {
        // AUTO_IGNORE — no match found or score too low; mark swept, no proposal
        await markSwept(supabase, record.id, organizationId, "swept");
        skipped++;
      }
    } catch (err) {
      console.error(`[sweeper] Error processing record ${record.id}:`, err instanceof Error ? err.message : err);
      // Fail-safe: mark swept to avoid infinite retry on a broken record
      await markSwept(supabase, record.id, organizationId, "swept");
      skipped++;
    }
  }

  return { processed: records.length, proposed, skipped };
}

// Returns org IDs that have unswept records, capped at `limit`.
// Called from the cron route to decide which orgs to enqueue sweep jobs for.
export async function getOrgsWithPendingSweep(limit = 50): Promise<string[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("master_customers")
    .select("organization_id")
    .or("keeper_sweep_status.is.null,keeper_sweep_status.eq.pending")
    .order("keeper_last_swept_at", { ascending: true, nullsFirst: true })
    .limit(limit * 10); // over-fetch to account for duplicates after dedup

  if (!data) return [];

  // Deduplicate org IDs while preserving order
  const seen = new Set<string>();
  const orgs: string[] = [];
  for (const row of data) {
    if (!seen.has(row.organization_id) && orgs.length < limit) {
      seen.add(row.organization_id);
      orgs.push(row.organization_id);
    }
  }
  return orgs;
}
