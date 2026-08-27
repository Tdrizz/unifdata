/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { logActivity } from "@/lib/crm/activity";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "No company" }, { status: 403 });

  const { company } = currentCompany;

  let body: { boardId?: string; stageId?: string; contactId?: string; name?: string; value?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { boardId, stageId, contactId, name, value } = body;
  if (!boardId || !stageId || !contactId || !name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify board belongs to org
  const { data: board } = await (supabase as any)
    .from("process_boards")
    .select("id")
    .eq("id", boardId)
    .eq("organization_id", company.id)
    .maybeSingle();

  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

  // Service role bypasses RLS, so client-supplied ids must be verified to belong
  // to this org before they are inserted or joined against — otherwise the
  // master_customers embed below would echo back a foreign tenant's contact.
  const { data: stage } = await (supabase as any)
    .from("board_stages")
    .select("id")
    .eq("id", stageId)
    .eq("organization_id", company.id)
    .maybeSingle();

  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 400 });

  const { data: contact } = await (supabase as any)
    .from("master_customers")
    .select("id")
    .eq("id", contactId)
    .eq("organization_id", company.id)
    .maybeSingle();

  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 400 });

  const { data: record, error } = await (supabase as any)
    .from("process_records")
    .insert({
      organization_id: company.id,
      board_id: boardId,
      stage_id: stageId,
      contact_id: contactId,
      name,
      value: value ?? null,
      status: "active",
    })
    .select(`
      id, name, value, target_date, status, stage_id, contact_id, created_at,
      contact:master_customers(id, first_name, last_name)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  try {
    await logActivity(supabase, company.id, contactId, {
      type: "record_created",
      label: `Record created: ${name}`,
      referenceId: record.id,
      referenceType: "process_record",
      source: "user",
    });
  } catch {
    // Non-fatal
  }

  return NextResponse.json(record);
}
