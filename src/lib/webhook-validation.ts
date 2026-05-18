import crypto from "crypto";

// ── E.164 phone normalization ──────────────────────────────────────────────────
// Twilio always sends numbers in E.164 format (+14155551234).
// We store them without the + in master_customers.primary_phone,
// so strip it for DB lookups and restore it for outbound API calls.

export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export function stripE164Plus(e164: string): string {
  return e164.startsWith("+") ? e164.slice(1) : e164;
}

// ── Twilio HMAC-SHA1 validation ────────────────────────────────────────────────
// Spec blueprint: sign URL + sorted POST params with TWILIO_AUTH_TOKEN.
// Returns true if the request is authentic.

export function validateTwilioSignature(
  authToken: string,
  webhookUrl: string,
  params: Record<string, string>,
  twilioSignature: string,
): boolean {
  // Sort params alphabetically, concatenate key+value pairs onto the URL.
  const paramString = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], "");

  const expectedSignature = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(webhookUrl + paramString))
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(twilioSignature),
  );
}

// ── Mailgun HMAC-SHA256 validation ─────────────────────────────────────────────
// Signs timestamp+token with the Mailgun webhook signing key.
// Also checks timestamp recency to block replay attacks (5-minute window).

export function validateMailgunSignature(
  signingKey: string,
  timestamp: string,
  token: string,
  signature: string,
): boolean {
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) return false; // replay protection

  const expected = crypto
    .createHmac("sha256", signingKey)
    .update(timestamp + token)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature),
  );
}

// ── QuickBooks HMAC-SHA256 validation ─────────────────────────────────────────
// QuickBooks sends intuit-signature as a base64 HMAC-SHA256 of the raw body.

export function validateQuickBooksSignature(
  verifierToken: string,
  rawBody: string,
  intuitSignature: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", verifierToken)
    .update(rawBody)
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(intuitSignature),
  );
}
