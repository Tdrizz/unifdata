import crypto from "crypto";
import { describe, it, expect } from "vitest";
import {
  validateTwilioSignature,
  validateMailgunSignature,
  validateQuickBooksSignature,
  toE164,
  stripE164Plus,
} from "@/lib/webhook-validation";

// ── Twilio ─────────────────────────────────────────────────────────────────────

describe("validateTwilioSignature", () => {
  const authToken = "test-token-abc123";
  const webhookUrl = "https://app.unifdata.com/api/webhooks/twilio";
  const params = { Body: "hello", From: "+14155551234", To: "+18005559876" };

  function makeSignature(url: string, p: Record<string, string>, token: string) {
    const paramString = Object.keys(p)
      .sort()
      .reduce((acc, key) => acc + key + p[key], "");
    return crypto
      .createHmac("sha1", token)
      .update(Buffer.from(url + paramString))
      .digest("base64");
  }

  it("accepts a valid signature", () => {
    const sig = makeSignature(webhookUrl, params, authToken);
    expect(validateTwilioSignature(authToken, webhookUrl, params, sig)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = makeSignature(webhookUrl, params, authToken);
    const tampered = { ...params, Body: "injected" };
    expect(validateTwilioSignature(authToken, webhookUrl, tampered, sig)).toBe(false);
  });

  it("rejects a wrong auth token", () => {
    const sig = makeSignature(webhookUrl, params, "wrong-token");
    expect(validateTwilioSignature(authToken, webhookUrl, params, sig)).toBe(false);
  });

  it("rejects a wrong URL", () => {
    const sig = makeSignature("https://evil.com/hook", params, authToken);
    expect(validateTwilioSignature(authToken, webhookUrl, params, sig)).toBe(false);
  });

  it("handles empty params", () => {
    const sig = makeSignature(webhookUrl, {}, authToken);
    expect(validateTwilioSignature(authToken, webhookUrl, {}, sig)).toBe(true);
  });
});

// ── Mailgun ────────────────────────────────────────────────────────────────────

describe("validateMailgunSignature", () => {
  const signingKey = "mg-key-xyz";
  const recentTimestamp = String(Math.floor(Date.now() / 1000) - 30);
  const token = "mailguntoken42";

  function makeMailgunSig(ts: string, tok: string, key: string) {
    return crypto.createHmac("sha256", key).update(ts + tok).digest("hex");
  }

  it("accepts a valid recent signature", () => {
    const sig = makeMailgunSig(recentTimestamp, token, signingKey);
    expect(validateMailgunSignature(signingKey, recentTimestamp, token, sig)).toBe(true);
  });

  it("rejects an expired timestamp (> 5 min)", () => {
    const oldTs = String(Math.floor(Date.now() / 1000) - 400);
    const sig = makeMailgunSig(oldTs, token, signingKey);
    expect(validateMailgunSignature(signingKey, oldTs, token, sig)).toBe(false);
  });

  it("rejects a future timestamp outside window", () => {
    const futureTs = String(Math.floor(Date.now() / 1000) + 400);
    const sig = makeMailgunSig(futureTs, token, signingKey);
    expect(validateMailgunSignature(signingKey, futureTs, token, sig)).toBe(false);
  });

  it("rejects a tampered token", () => {
    const sig = makeMailgunSig(recentTimestamp, token, signingKey);
    expect(validateMailgunSignature(signingKey, recentTimestamp, "tampered", sig)).toBe(false);
  });

  it("rejects a wrong signing key", () => {
    const sig = makeMailgunSig(recentTimestamp, token, "wrong-key");
    expect(validateMailgunSignature(signingKey, recentTimestamp, token, sig)).toBe(false);
  });
});

// ── QuickBooks ─────────────────────────────────────────────────────────────────

describe("validateQuickBooksSignature", () => {
  const verifierToken = "qb-verifier-token";
  const rawBody = '{"eventNotifications":[]}';

  function makeQBSig(body: string, token: string) {
    return crypto.createHmac("sha256", token).update(body).digest("base64");
  }

  it("accepts a valid signature", () => {
    const sig = makeQBSig(rawBody, verifierToken);
    expect(validateQuickBooksSignature(verifierToken, rawBody, sig)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = makeQBSig(rawBody, verifierToken);
    expect(validateQuickBooksSignature(verifierToken, '{"tampered":true}', sig)).toBe(false);
  });

  it("rejects a wrong verifier token", () => {
    const sig = makeQBSig(rawBody, "wrong-token");
    expect(validateQuickBooksSignature(verifierToken, rawBody, sig)).toBe(false);
  });

  it("handles an empty body", () => {
    const sig = makeQBSig("", verifierToken);
    expect(validateQuickBooksSignature(verifierToken, "", sig)).toBe(true);
  });
});

// ── Phone utils ────────────────────────────────────────────────────────────────

describe("toE164", () => {
  it("converts 10-digit US number", () => {
    expect(toE164("4155551234")).toBe("+14155551234");
  });

  it("converts 11-digit number starting with 1", () => {
    expect(toE164("14155551234")).toBe("+14155551234");
  });

  it("strips non-digits and converts", () => {
    expect(toE164("(415) 555-1234")).toBe("+14155551234");
  });

  it("preserves already-E164 numbers", () => {
    expect(toE164("+14155551234")).toBe("+14155551234");
  });
});

describe("stripE164Plus", () => {
  it("strips leading +", () => {
    expect(stripE164Plus("+14155551234")).toBe("14155551234");
  });

  it("leaves numbers without + unchanged", () => {
    expect(stripE164Plus("14155551234")).toBe("14155551234");
  });
});
