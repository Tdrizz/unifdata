import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { logActivity } from "@/lib/crm/activity";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "No company" }, { status: 403 });

  const { company } = currentCompany;

  let body: { stageId?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify record belongs to org
  const { data: existing } = await (supabase as any)
    .from("process_records")
    .select("id, contact_id, stage_id, name")
    .eq("id", id)
    .eq("organization_id", company.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.stageId) updates.stage_id = body.stageId;
  if (body.status) updates.status = body.status;

  const { data: updated, error } = await (supabase as any)
    .from("process_records")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log stage change activity
  if (body.stageId && body.stageId !== existing.stage_id) {
    try {
      await logActivity(supabase, company.id, existing.contact_id, {
        type: "process_stage_changed",
        label: `Record "${existing.name}" moved to new stage`,
        referenceId: id,
        referenceType: "process_record",
        source: "user",
      });
    } catch {
      // Non-fatal
    }
  }

  return NextResponse.json(updated);
}
