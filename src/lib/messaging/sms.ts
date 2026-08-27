/**
 * Shared Twilio SMS sender — used by the messages API and automation actions.
 * Throws with a clear message when Twilio env vars are missing or the send fails.
 *
 * Every company shares the same Twilio number (no per-tenant numbers or
 * 10DLC registration -- that's a much larger, separate effort), so a
 * recipient has no way to tell which business is texting them unless the
 * business says so in the message itself. companyName is prepended to the
 * body for exactly that reason -- pass it whenever the caller has a company
 * in scope.
 */
export async function sendSms(to: string, body: string, companyName?: string): Promise<string> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Missing Twilio environment variables.");
  }

  const outboundBody = companyName ? `${companyName}: ${body}` : body;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: outboundBody }),
    },
  );

  const data = (await response.json()) as { sid?: string; message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? "Twilio send failed.");
  }

  return data.sid ?? "";
}
