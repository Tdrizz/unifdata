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

  const { data: proposal } = await admin
    .from("data_reconciliation_proposals")
    .select("id")
    .eq("id", id)
    .eq("organization_id", company.id)
    .eq("status", "PENDING")
    .maybeSingle();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  await admin
    .from("data_reconciliation_proposals")
    .update({ status: "REJECTED" })
    .eq("id", id)
    .eq("organization_id", company.id);

  return NextResponse.json({ ok: true });
}
