import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

export async function GET() {
  try {
    const currentCompany = await getCurrentCompany();
    if (!currentCompany) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_drafts")
      .select("id, draft_type, subject, body, recipient_info, action_label, approve_action, approve_args, created_at")
      .eq("organization_id", currentCompany.company.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ drafts: data ?? [] });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (err instanceof Error && (err as any).digest?.startsWith("NEXT_REDIRECT")) throw err;
    console.error("[agent-drafts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
