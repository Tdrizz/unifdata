import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// OAuth access/refresh tokens for connected integrations (Jobber,
// QuickBooks, HubSpot, Square, Stripe, Google) were stored as plaintext
// columns in the `integrations` table -- anyone with a DB dump (a backup,
// a misconfigured export, a compromised service-role key) could use them
// directly against the customer's own connected accounts. These wrap every
// token read/write in AES-256-GCM, keyed from an env var the DB itself
// never holds, so a DB dump alone is useless without that separately-held
// secret.
//
// Format: base64(iv[12] || authTag[16] || ciphertext). IV is regenerated
// per encryption call (AES-GCM must never reuse an IV under the same key).

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set -- required to read or write integration OAuth tokens.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded AES-256 key).");
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptToken(ciphertext: string): string {
  const raw = Buffer.from(ciphertext, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

// null/undefined pass through unchanged -- every token column in this app
// is nullable (an integration row can exist mid-flow with no token yet).
export function encryptTokenOrNull(plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null;
  return encryptToken(plaintext);
}

export function decryptTokenOrNull(ciphertext: string | null | undefined): string | null {
  if (ciphertext == null) return null;
  return decryptToken(ciphertext);
}

// Applied once, right after every `integrations` row is fetched, so every
// downstream read of `.access_token`/`.refresh_token` on that in-memory
// object sees plaintext -- callers never decrypt piecemeal themselves.
export function decryptIntegrationRow<T extends { access_token?: string | null; refresh_token?: string | null }>(
  row: T,
): T {
  return {
    ...row,
    access_token: decryptTokenOrNull(row.access_token) as T["access_token"],
    refresh_token: decryptTokenOrNull(row.refresh_token) as T["refresh_token"],
  };
}
