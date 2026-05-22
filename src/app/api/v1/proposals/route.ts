import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) {
    return NextResponse.json({ error: "No company context" }, { status: 401 });
  }

  const { company } = currentCompany;

  const { data: proposals, error } = await supabase
    .from("data_reconciliation_proposals")
    .select("*")
    .eq("organization_id", company.id)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposals: proposals ?? [] });
}
