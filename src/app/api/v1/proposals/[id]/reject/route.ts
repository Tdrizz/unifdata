import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCompany } from "@/lib/current-company";

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

  // Atomic flip: PENDING → REJECTED in a single UPDATE…WHERE (mirrors approve's claim pattern)
  const { data: proposal } = await admin
    .from("data_reconciliation_proposals")
    .update({ status: "REJECTED" })
    .eq("id", id)
    .eq("organization_id", company.id)
    .eq("status", "PENDING")
    .select("id")
    .maybeSingle();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found or already processed" }, { status: 404 });
  }

  await admin.from("ai_data_keeper_audit_logs").insert({
    organization_id: company.id,
    action_type: "PROP_REJECTED",
    description: `Proposal ${id} rejected by user ${user.id}.`,
    payload_snapshot: { proposalId: id, rejectedBy: user.id },
  });

  return NextResponse.json({ ok: true });
}
