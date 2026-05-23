import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const supabase = await createClient();
  await supabase
    .from("agent_alerts")
    .update({ status: "dismissed" })
    .eq("id", id)
    .eq("organization_id", currentCompany.company.id);

  return NextResponse.json({ ok: true });
}
