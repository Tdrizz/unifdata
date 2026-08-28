import { Resend } from "resend";

/**
 * Shared Resend email sender for every customer-facing send in the app
 * (Communications, Vera's outreach drafts and autopilot, the weekly digest).
 * Throws with a clear message when Resend env vars are missing or the send
 * fails -- callers decide how to surface that (see the pattern in sendSms).
 *
 * Resend verifies at the domain level, not per-mailbox, so every company can
 * get its own mailbox name under the one shared, already-verified domain
 * (RESEND_FROM_EMAIL's domain) with no per-tenant DNS work -- pass a
 * company's email_slug as fromLocalPart to send as e.g.
 * "acme-plumbing@unifdata.com" instead of the shared default address.
 * companyName is still prepended to the display name on top of that, same
 * reason it is on SMS: it's what the recipient actually reads in their inbox.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  companyName?: string;
  fromLocalPart?: string | null;
}): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromAddress) {
    throw new Error("Missing Resend environment variables.");
  }

  const domain = fromAddress.split("@")[1];
  const address = opts.fromLocalPart && domain ? `${opts.fromLocalPart}@${domain}` : fromAddress;
  const from = opts.companyName ? `${opts.companyName} <${address}>` : address;
  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    ...(opts.html ? { html: opts.html } : {}),
  });

  if (error) {
    throw new Error(error.message ?? "Resend send failed.");
  }

  return data?.id ?? "";
}
