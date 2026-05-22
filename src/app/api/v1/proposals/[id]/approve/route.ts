import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCompany } from "@/lib/current-company";
import { redis } from "@/lib/redis";
import type { FieldDelta, NormalizedPayload } from "@/lib/data-keeper/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  // Fetch the proposal and verify org ownership
  const { data: proposal } = await admin
    .from("data_reconciliation_proposals")
    .select("*")
    .eq("id", id)
    .eq("organization_id", company.id)
    .eq("status", "PENDING")
    .maybeSingle();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
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

    await admin
      .from("master_customers")
      .update(updateRecord)
      .eq("id", proposal.target_record_id)
      .eq("organization_id", company.id);
  } else if (!proposal.target_record_id && changes.normalizedData) {
    // Proposal was for a new record — create it now
    const p = changes.normalizedData;
    await admin.from("master_customers").insert({
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
  }

  // Write sync token to prevent echo loop from the write we just made
  if (redis && changes.normalizedData) {
    const p = changes.normalizedData;
    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ organizationId: company.id, email: p.email, phone: p.phone }))
      .digest("hex");
    await redis.set(`sync_token:${hash}`, "true", { ex: 60 });
  }

  // Flip status to APPROVED
  await admin
    .from("data_reconciliation_proposals")
    .update({ status: "APPROVED" })
    .eq("id", id);

  // Audit log
  await admin.from("ai_data_keeper_audit_logs").insert({
    organization_id: company.id,
    action_type: "AUTO_MERGE",
    description: `Proposal ${id} approved by user ${user.id}.`,
    payload_snapshot: { proposalId: id, approvedBy: user.id },
  });

  return NextResponse.json({ ok: true });
}
