/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

// Soft-delete: sets archived_at rather than removing the row, so the
// message history (a real record of what was said to a customer) survives
// and an inbound reply or messaging the contact again can bring the
// conversation back into the inbox (see the webhooks and api/communications/start).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: threadId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "No company" }, { status: 403 });
  const { company } = currentCompany;

  const { data: thread, error } = await (supabase as any)
    .from("communications")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", threadId)
    .eq("organization_id", company.id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
