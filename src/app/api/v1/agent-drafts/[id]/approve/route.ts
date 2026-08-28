import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { recordDraftOutcome } from "@/lib/agents/memory";
import { sendSms } from "@/lib/messaging/sms";

type DraftRow = {
  approve_action: string | null;
  approve_args: Record<string, string> | null;
  record_id: string | null;
  organization_id: string;
  signal_type: string | null;
  recipient_info: Record<string, string> | null;
  subject: string | null;
  body: string | null;
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

  // Load the draft (RLS ensures it belongs to this org)
  const { data: draft, error: fetchError } = await supabase
    .from("agent_drafts")
    .select("approve_action, approve_args, record_id, organization_id, signal_type, recipient_info, subject, body")
    .eq("id", id)
    .eq("organization_id", currentCompany.company.id)
    .single() as { data: DraftRow | null; error: unknown };

  if (fetchError || !draft) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }

  // Resolve the message content and recipient. approve_args only carries
  // { customer_id, customer_name }; the actual subject/body live on the draft row,
  // and the recipient address on the linked contact in master_customers.
  const args = (draft.approve_args ?? {}) as Record<string, string>;
  const contactId = draft.recipient_info?.customer_id ?? args.customer_id ?? null;

  let recipientEmail: string | null = null;
  let recipientPhone: string | null = null;
  if (contactId) {
    const { data: contact } = await supabase
      .from("master_customers")
      .select("primary_email, primary_phone")
      .eq("id", contactId)
      .eq("organization_id", currentCompany.company.id)
      .maybeSingle();
    recipientEmail = contact?.primary_email ?? null;
    recipientPhone = contact?.primary_phone ?? null;
  }

  const subject = draft.subject ?? args.subject ?? "Message from your service provider";
  const body = draft.body ?? args.body ?? "";

  // Execute the approved action
  let sendSucceeded = false;

  if (draft.approve_action === "send_email") {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    // Shared sending domain across every company -- the display name is
    // what actually tells the recipient which business emailed them.
    const from = `${currentCompany.company.name} <${process.env.MAILGUN_FROM_EMAIL ?? `noreply@${domain}`}>`;
    const toEmail = recipientEmail ?? args.email ?? null;

    if (!apiKey || !domain) {
      return NextResponse.json({ error: "Email is not configured." }, { status: 503 });
    }
    if (!toEmail) {
      return NextResponse.json({ error: "No email address on file for this contact." }, { status: 422 });
    }

    const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      },
      body: new URLSearchParams({ from, to: toEmail, subject, text: body }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return NextResponse.json({ error: `Email delivery failed: ${res.status} ${errBody}` }, { status: 502 });
    }
    sendSucceeded = true;
  } else if (draft.approve_action === "send_sms") {
    const rawPhone = recipientPhone ?? args.phone ?? null;
    const toPhone = rawPhone
      ? (rawPhone.startsWith("+") ? rawPhone : `+1${rawPhone.replace(/\D/g, "")}`)
      : null;

    if (!toPhone) {
      return NextResponse.json({ error: "No phone number on file for this contact." }, { status: 422 });
    }

    try {
      await sendSms(toPhone, body, currentCompany.company.name);
      sendSucceeded = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "SMS delivery failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  // approve_action is nullable and free text -- both branches above return
  // early on any failure, but a null or unrecognized action falls through
  // here having sent nothing. Catch that rather than marking it approved.
  if (!sendSucceeded) {
    return NextResponse.json({ error: "This draft isn't set up to send yet." }, { status: 422 });
  }

  // Mark approved
  await supabase
    .from("agent_drafts")
    .update({ status: "approved" })
    .eq("id", id)
    .eq("organization_id", currentCompany.company.id);

  // Write ROI event only when a message was actually sent and there's a linked record
  if (sendSucceeded && draft.record_id && draft.approve_action === "send_email") {
    await supabase.from("roi_events").insert({
      organization_id: draft.organization_id,
      event_type: "outreach_sent",
      record_id: draft.record_id,
      triggered_by: "outreach-worker",
    });
  }

  // Record outcome in agent memory for suppression / escalation tracking
  if (draft.signal_type) {
    const customerId = draft.recipient_info?.customer_id ?? null;
    await recordDraftOutcome(draft.organization_id, draft.signal_type, customerId, "approved").catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
