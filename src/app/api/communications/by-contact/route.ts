/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

// Powers the read-only communications preview on a customer's detail page
// (ContactCommunicationsTab) -- same client-side-RLS-can't-see-anything
// issue as the main Communications inbox: the browser's Supabase client has
// no real session (this app's identity system is Clerk, not Supabase Auth),
// so a direct client-side query here always silently returned nothing.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contact_id");
  if (!contactId) return NextResponse.json({ error: "contact_id is required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "No company" }, { status: 403 });
  const { company } = currentCompany;

  // A contact can have both an SMS and an email thread now -- order + limit
  // so this doesn't hit .maybeSingle()'s "more than one row" error and show
  // whichever one is most recently active.
  const { data: thread } = await (supabase as any)
    .from("communications")
    .select("id, contact_phone")
    .eq("organization_id", company.id)
    .eq("contact_id", contactId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!thread) return NextResponse.json({ thread: null, messages: [] });

  const { data: messages } = await (supabase as any)
    .from("communication_messages")
    .select("id, direction, body, sent_at")
    .eq("communication_id", thread.id)
    .order("sent_at", { ascending: true });

  return NextResponse.json({ thread, messages: messages ?? [] });
}
