import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { setOrgScope } from "@/lib/supabase/org-scope";
import { redis } from "@/lib/redis";
import type { DataKeeperDecision, NormalizedPayload, FieldDelta } from "./types";

// Counts non-null fields in a normalized payload to compute health score delta.
function countFilledFields(payload: NormalizedPayload): number {
  return [
    payload.firstName,
    payload.lastName,
    payload.email,
    payload.phone,
    payload.businessName,
  ].filter(Boolean).length;
}

async function writeAuditLog(
  supabase: SupabaseClient,
  organizationId: string,
  actionType: string,
  description: string,
  payloadSnapshot: object,
) {
  await supabase.from("ai_data_keeper_audit_logs").insert({
    organization_id: organizationId,
    action_type: actionType,
    description,
    payload_snapshot: payloadSnapshot,
  });
}

async function writeSyncToken(
  organizationId: string,
  payload: NormalizedPayload,
) {
  if (!redis) return;
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ organizationId, email: payload.email, phone: payload.phone }))
    .digest("hex");
  await redis.set(`sync_token:${hash}`, "true", { ex: 60 });
}

function buildUpdateRecord(
  decision: DataKeeperDecision,
  sourceSystem: string,
): Record<string, unknown> {
  const { normalizedData: p, fieldDelta } = decision;
  const record: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Apply field delta — only update fields that are actually changing to non-null values
  for (const [field, change] of Object.entries(fieldDelta as FieldDelta)) {
    if (change.to === null || field.startsWith("metadata.")) continue;
    // Field-precedence: don't overwrite better data with empty/null
    if (change.to !== null && change.to !== "") {
      record[field] = change.to;
    }
  }

  // Always try to fill in null fields
  if (p.firstName && !("first_name" in record)) record.first_name = p.firstName;
  if (p.lastName && !("last_name" in record)) record.last_name = p.lastName;
  if (p.email && !("primary_email" in record)) record.primary_email = p.email;
  if (p.phone && !("primary_phone" in record)) record.primary_phone = p.phone;

  // Source-system metadata
  if (sourceSystem) {
    record.metadata = { [`last_sync_${sourceSystem}`]: new Date().toISOString() };
  }

  return record;
}

export async function executeDecision(
  organizationId: string,
  decision: DataKeeperDecision,
  sourceSystem: string,
): Promise<void> {
  const supabase = createAdminClient();
  await setOrgScope(supabase, organizationId);

  switch (decision.action) {
    case "AUTO_UPDATE": {
      if (!decision.targetId) break;

      const updateData = buildUpdateRecord(decision, sourceSystem);

      // Increment data_health_score for filled fields
      const healthDelta = countFilledFields(decision.normalizedData) * 2;

      const { data: current } = await supabase
        .from("master_customers")
        .select("data_health_score")
        .eq("id", decision.targetId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      const currentScore = current?.data_health_score ?? 100;
      const newScore = Math.min(100, currentScore + healthDelta);

      await supabase
        .from("master_customers")
        .update({ ...updateData, data_health_score: newScore })
        .eq("id", decision.targetId)
        .eq("organization_id", organizationId);

      await writeSyncToken(organizationId, decision.normalizedData);

      await writeAuditLog(
        supabase,
        organizationId,
        "AUTO_MERGE",
        `Auto-merged payload into master record ${decision.targetId}. Confidence: ${Math.round(decision.confidence * 100)}%. ${decision.reasoning}`,
        {
          targetId: decision.targetId,
          fieldDelta: decision.fieldDelta,
          confidence: decision.confidence,
          sourceSystem,
        },
      );
      break;
    }

    case "AUTO_CREATE": {
      const { normalizedData: p } = decision;

      const healthScore = 50 + countFilledFields(p) * 10;

      const { data: created } = await supabase
        .from("master_customers")
        .insert({
          organization_id: organizationId,
          first_name: p.firstName,
          last_name: p.lastName,
          primary_email: p.email,
          primary_phone: p.phone,
          data_health_score: Math.min(100, healthScore),
          metadata: {
            ...(p.businessName ? { business_name: p.businessName } : {}),
            ...p.extractedMetadata,
            created_by: "data_keeper",
            source_system: sourceSystem,
          },
        })
        .select("id")
        .single();

      if (created) {
        await writeSyncToken(organizationId, p);
        await writeAuditLog(
          supabase,
          organizationId,
          "AUTO_CREATE",
          `Created new master customer record ${created.id} from ${sourceSystem} payload.`,
          {
            createdId: created.id,
            normalizedData: p,
            sourceSystem,
          },
        );
      }
      break;
    }

    case "CREATE_PROPOSAL": {
      await supabase.from("data_reconciliation_proposals").insert({
        organization_id: organizationId,
        target_table: "master_customers",
        target_record_id: decision.targetId ?? null,
        confidence_score: decision.confidence,
        proposed_changes: {
          updates: decision.fieldDelta,
          normalizedData: decision.normalizedData,
          metadata: decision.normalizedData.extractedMetadata,
        },
        raw_reasoning: decision.reasoning,
        status: "PENDING",
      });

      await writeAuditLog(
        supabase,
        organizationId,
        "PROP_GENERATED",
        `Staged data reconciliation proposal. Confidence: ${Math.round(decision.confidence * 100)}%.`,
        {
          targetId: decision.targetId,
          confidence: decision.confidence,
          sourceSystem,
        },
      );
      break;
    }

    case "AUTO_IGNORE":
      // Intentional no-op — no log to reduce noise
      break;
  }
}
