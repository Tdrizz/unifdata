/**
 * OAuth tokens for connected integrations (Jobber/QuickBooks/HubSpot/Square/
 * Stripe/Google) used to be stored as plaintext columns -- these are the
 * AES-256-GCM helpers that encrypt them at rest. Covered here: round-trip
 * correctness, a fresh IV/ciphertext per call (GCM must never reuse an IV
 * under the same key), tamper detection (GCM's auth tag must reject
 * corrupted ciphertext rather than silently decrypt garbage), and the
 * null-passthrough helpers used at every nullable token column.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptToken, decryptToken, encryptTokenOrNull, decryptTokenOrNull, decryptIntegrationRow } from "@/lib/integrations/token-crypto";

// 32 bytes, base64-encoded -- a fixed test key so encrypt/decrypt round-trips
// are deterministic regardless of what's set in the real environment.
const TEST_KEY = Buffer.alloc(32, 7).toString("base64");
const ORIGINAL_KEY = process.env.TOKEN_ENCRYPTION_KEY;

beforeEach(() => {
  process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
  else process.env.TOKEN_ENCRYPTION_KEY = ORIGINAL_KEY;
});

describe("encryptToken / decryptToken", () => {
  it("round-trips a token through encrypt then decrypt", () => {
    const plaintext = "sk_live_abcdef1234567890";
    const ciphertext = encryptToken(plaintext);
    expect(decryptToken(ciphertext)).toBe(plaintext);
  });

  it("never stores the plaintext token inside the ciphertext", () => {
    const plaintext = "super-secret-oauth-token";
    const ciphertext = encryptToken(plaintext);
    expect(ciphertext).not.toContain(plaintext);
  });

  it("produces different ciphertext for the same plaintext on repeated calls (fresh IV)", () => {
    const plaintext = "same-token-value";
    const first = encryptToken(plaintext);
    const second = encryptToken(plaintext);
    expect(first).not.toBe(second);
    // Both still decrypt correctly despite being different ciphertext.
    expect(decryptToken(first)).toBe(plaintext);
    expect(decryptToken(second)).toBe(plaintext);
  });

  it("rejects corrupted ciphertext instead of silently returning garbage (GCM auth tag)", () => {
    const ciphertext = encryptToken("a-valid-token");
    const raw = Buffer.from(ciphertext, "base64");
    // Flip a byte inside the ciphertext portion (past the 12-byte IV + 16-byte tag).
    raw[raw.length - 1] ^= 0xff;
    const tampered = raw.toString("base64");
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("throws if TOKEN_ENCRYPTION_KEY is not set", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken("x")).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });

  it("throws if TOKEN_ENCRYPTION_KEY doesn't decode to 32 bytes", () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    expect(() => encryptToken("x")).toThrow(/32 bytes/);
  });
});

describe("encryptTokenOrNull / decryptTokenOrNull", () => {
  it("passes null and undefined through unchanged", () => {
    expect(encryptTokenOrNull(null)).toBeNull();
    expect(encryptTokenOrNull(undefined)).toBeNull();
    expect(decryptTokenOrNull(null)).toBeNull();
    expect(decryptTokenOrNull(undefined)).toBeNull();
  });

  it("round-trips a non-null value", () => {
    const ciphertext = encryptTokenOrNull("a-refresh-token");
    expect(ciphertext).not.toBeNull();
    expect(decryptTokenOrNull(ciphertext)).toBe("a-refresh-token");
  });
});

describe("decryptIntegrationRow", () => {
  it("decrypts access_token and refresh_token in place, leaving other fields untouched", () => {
    const row = {
      id: "int-1",
      access_token: encryptToken("access-plain"),
      refresh_token: encryptToken("refresh-plain"),
      provider_account_name: "Acme Co",
    };
    const decrypted = decryptIntegrationRow(row);
    expect(decrypted.access_token).toBe("access-plain");
    expect(decrypted.refresh_token).toBe("refresh-plain");
    expect(decrypted.provider_account_name).toBe("Acme Co");
    expect(decrypted.id).toBe("int-1");
  });

  it("leaves null tokens as null", () => {
    const row = { id: "int-2", access_token: null, refresh_token: null };
    const decrypted = decryptIntegrationRow(row);
    expect(decrypted.access_token).toBeNull();
    expect(decrypted.refresh_token).toBeNull();
  });
});
