import { Resend } from "resend";

/**
 * Shared Resend email sender for every customer-facing send in the app
 * (Communications, Vera's outreach drafts and autopilot, the weekly digest).
 * Throws with a clear message when Resend env vars are missing or the send
 * fails -- callers decide how to surface that (see the pattern in sendSms).
 *
 * Every company shares the same Resend sending identity for now (no per-
 * tenant domains yet), so companyName is prepended to the "From" display
 * name for exactly the reason it is on SMS: it's the only thing that tells
 * the recipient which business actually emailed them.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  companyName?: string;
}): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromAddress) {
    throw new Error("Missing Resend environment variables.");
  }

  const from = opts.companyName ? `${opts.companyName} <${fromAddress}>` : fromAddress;
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
