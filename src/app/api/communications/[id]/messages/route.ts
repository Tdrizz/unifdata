/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

// The browser's Supabase client (src/lib/supabase/client.ts) is a plain
// anon-key client with no session -- this app's real identity system is
// Clerk, not Supabase Auth, so auth.uid() is always null for it and RLS
// (is_company_member(), which checks auth.uid()) silently returns zero
// rows for every client-side query, no matter what's actually in the
// table. CommunicationsClient used to query communication_messages
// directly with that client, which is why messages never actually loaded
// client-side -- this route serves them instead, the same
// verified-server-side-then-admin-client pattern every other route in
// this app already uses.
export async function GET(
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

  const { data: thread } = await (supabase as any)
    .from("communications")
    .select("id")
    .eq("id", threadId)
    .eq("organization_id", company.id)
    .maybeSingle();
  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const { data: messages, error } = await (supabase as any)
    .from("communication_messages")
    .select("id, communication_id, direction, body, status, sent_at")
    .eq("communication_id", threadId)
    .order("sent_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(messages ?? []);
}
