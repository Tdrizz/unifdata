import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCompany } from "@/lib/current-company";
import { redis } from "@/lib/redis";
import type { FieldDelta, NormalizedPayload } from "@/lib/data-keeper/types";
import type { TablesUpdate } from "@/types/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "No company" }, { status: 401 });

  const { company } = currentCompany;
  const admin = createAdminClient();

  // Atomic claim: flip PENDING → PROCESSING in a single UPDATE…WHERE.
  // Only one concurrent request can claim the row; others get null back.
  const { data: proposal } = await admin
    .from("data_reconciliation_proposals")
    .update({ status: "PROCESSING" })
    .eq("id", id)
    .eq("organization_id", company.id)
    .eq("status", "PENDING")
    .select("*")
    .maybeSingle();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found or already processed" }, { status: 404 });
  }

  const changes = proposal.proposed_changes as {
    updates?: FieldDelta;
    normalizedData?: NormalizedPayload;
  };

  // Apply field delta to master_customers
  if (proposal.target_record_id && changes.updates) {
    const updateRecord: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    for (const [field, change] of Object.entries(changes.updates)) {
      if (!field.startsWith("metadata.") && change.to !== null) {
        updateRecord[field] = change.to;
      }
    }

    const { error: updateError } = await admin
      .from("master_customers")
      .update(updateRecord as TablesUpdate<"master_customers">)
      .eq("id", proposal.target_record_id)
      .eq("organization_id", company.id);
    if (updateError) {
      // Don't flip the proposal to APPROVED if the data write failed — leave it
      // retryable instead of silently marking it done.
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else if (!proposal.target_record_id && changes.normalizedData) {
    // Proposal was for a new record — create it now
    const p = changes.normalizedData;
    const { error: insertError } = await admin.from("master_customers").insert({
      organization_id: company.id,
      first_name: p.firstName,
      last_name: p.lastName,
      primary_email: p.email,
      primary_phone: p.phone,
      metadata: {
        ...(p.businessName ? { business_name: p.businessName } : {}),
        ...p.extractedMetadata,
        approved_by: user.id,
      },
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  // Write sync token to prevent echo loop — covers both update and create paths.
  // Hash matches the format used by writeSyncToken in state-engine.ts.
  if (redis) {
    const p = changes.normalizedData;
    const email = p?.email ?? null;
    const phone = p?.phone ?? null;
    if (email || phone) {
      const hash = crypto
        .createHash("sha256")
        .update(JSON.stringify({ organizationId: company.id, email, phone }))
        .digest("hex");
      await redis.set(`sync_token:${hash}`, "true", { ex: 60 });
    }
  }

  // Flip status to APPROVED — org check prevents cross-tenant manipulation
  await admin
    .from("data_reconciliation_proposals")
    .update({ status: "APPROVED" })
    .eq("id", id)
    .eq("organization_id", company.id);

  // Audit log
  await admin.from("ai_data_keeper_audit_logs").insert({
    organization_id: company.id,
    action_type: "AUTO_MERGE",
    description: `Proposal ${id} approved by user ${user.id}.`,
    payload_snapshot: { proposalId: id, approvedBy: user.id },
  });

  return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (err instanceof Error && (err as any).digest?.startsWith("NEXT_REDIRECT")) throw err;
    console.error("[proposals-approve]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
