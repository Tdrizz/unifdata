/**
 * Shared Twilio SMS sender — used by the messages API and automation actions.
 * Throws with a clear message when Twilio env vars are missing or the send fails.
 */
export async function sendSms(to: string, body: string): Promise<string> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Missing Twilio environment variables.");
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: body }),
    },
  );

  const data = (await response.json()) as { sid?: string; message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? "Twilio send failed.");
  }

  return data.sid ?? "";
}
