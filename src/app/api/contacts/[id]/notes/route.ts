/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { logActivity } from "@/lib/crm/activity";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contactId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "No company" }, { status: 403 });

  const { company } = currentCompany;

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  // Verify contact belongs to org
  const { data: contact } = await (supabase as any)
    .from("master_customers")
    .select("id")
    .eq("id", contactId)
    .eq("organization_id", company.id)
    .maybeSingle();

  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const { data: note, error } = await (supabase as any)
    .from("contact_notes")
    .insert({
      organization_id: company.id,
      contact_id: contactId,
      content: body.content.trim(),
      author_name: user.email ?? null,
    })
    .select("id, content, pinned, author_name, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log activity
  try {
    await logActivity(supabase, company.id, contactId, {
      type: "note_added",
      label: "Note added",
      detail: body.content.slice(0, 100),
      referenceId: note.id,
      referenceType: "contact_note",
      source: "user",
    });
  } catch {
    // Non-fatal
  }

  return NextResponse.json(note);
}
