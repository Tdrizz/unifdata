import crypto from "crypto";

/**
 * Constant-time string comparison for shared secrets. Returns false on any
 * nullish value or length mismatch. Use instead of `===`/`!==` when comparing a
 * request-supplied secret against a server secret, so the compare doesn't leak
 * the secret's length/prefix through timing.
 */
export function safeSecretEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Verify an `Authorization: Bearer <secret>` header in constant time.
 */
export function verifyBearer(
  authHeader: string | null,
  secret: string | null | undefined,
): boolean {
  if (!secret) return false;
  const prefix = "Bearer ";
  if (!authHeader || !authHeader.startsWith(prefix)) return false;
  return safeSecretEqual(authHeader.slice(prefix.length), secret);
}
