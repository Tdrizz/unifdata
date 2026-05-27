import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { recordDraftOutcome } from "@/lib/agents/memory";

type DraftRow = {
  signal_type: string | null;
  recipient_info: Record<string, string> | null;
  organization_id: string;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  // Fetch the draft to capture signal_type for memory recording
  const { data: draft } = await supabase
    .from("agent_drafts")
    .select("signal_type, recipient_info, organization_id")
    .eq("id", id)
    .eq("organization_id", currentCompany.company.id)
    .single() as { data: DraftRow | null };

  await supabase
    .from("agent_drafts")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("organization_id", currentCompany.company.id);

  // Record outcome in agent memory
  if (draft?.signal_type) {
    const customerId = draft.recipient_info?.customer_id ?? null;
    await recordDraftOutcome(draft.organization_id, draft.signal_type, customerId, "rejected").catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
