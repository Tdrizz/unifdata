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

  // Load the draft (RLS ensures it belongs to this org)
  const { data: draft, error: fetchError } = await supabase
    .from("agent_drafts")
    .select("approve_action, approve_args, record_id, organization_id")
    .eq("id", id)
    .eq("organization_id", currentCompany.company.id)
    .single();

  if (fetchError || !draft) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }

  // Execute the approved action
  let sendSucceeded = false;

  if (draft.approve_action === "send_email") {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    const from = process.env.MAILGUN_FROM_EMAIL ?? `noreply@${domain}`;
    const args = (draft.approve_args ?? {}) as Record<string, string>;

    if (apiKey && domain && args.email) {
      const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          from,
          to: args.email,
          subject: args.subject ?? "Message from your service provider",
          text: args.body ?? "",
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return NextResponse.json({ error: `Email delivery failed: ${res.status} ${body}` }, { status: 502 });
      }
      sendSucceeded = true;
    }
  } else if (draft.approve_action === "send_sms") {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    const args = (draft.approve_args ?? {}) as Record<string, string>;

    if (accountSid && authToken && from && args.phone) {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: args.phone, From: from, Body: args.body ?? "" }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return NextResponse.json({ error: `SMS delivery failed: ${res.status} ${body}` }, { status: 502 });
      }
      sendSucceeded = true;
    }
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

  return NextResponse.json({ ok: true });
}
