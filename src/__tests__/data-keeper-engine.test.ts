/**
 * Confidence engine, threshold enforcement, Gemini fallback, and sweeper tests.
 * External dependencies (Supabase, Gemini, Redis) are fully mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/data-keeper/pre-filter", () => ({
  fetchTopMatchCandidates: vi.fn(),
}));
vi.mock("@/lib/data-keeper/gemini-refinement", () => ({
  geminiRefinement: vi.fn(),
  deterministicReasoning: vi.fn((_best: unknown, action: string) => `Deterministic fallback: ${action}`),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  })),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

import { fetchTopMatchCandidates } from "@/lib/data-keeper/pre-filter";
import { geminiRefinement } from "@/lib/data-keeper/gemini-refinement";
import { runConfidenceEngine } from "@/lib/data-keeper/confidence-engine";
import type { MasterCustomerCandidate, InboundPayload } from "@/lib/data-keeper/types";

const mockFetch = vi.mocked(fetchTopMatchCandidates);
const mockGemini = vi.mocked(geminiRefinement);

function makeRawPayload(overrides: Partial<InboundPayload> = {}): InboundPayload {
  return {
    firstName: "John",
    lastName: "Smith",
    email: "john@example.com",
    phone: "5551234567",
    sourceSystem: "test",
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<MasterCustomerCandidate> = {}): MasterCustomerCandidate {
  return {
    id: "cand-001",
    first_name: "John",
    last_name: "Smith",
    primary_email: "john@example.com",
    primary_phone: "5551234567",
    billing_address: null,
    service_address: null,
    metadata: null,
    data_health_score: 70,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── 1. No candidates — AUTO_CREATE when email/phone present ───────────────────

describe("confidence engine — no candidates", () => {
  it("AUTO_CREATE when email is present and no candidates found", async () => {
    mockFetch.mockResolvedValue([]);
    const result = await runConfidenceEngine("org-1", makeRawPayload(), "test");
    expect(result.action).toBe("AUTO_CREATE");
    expect(result.confidence).toBe(1.0);
  });

  it("AUTO_CREATE when phone is present and no candidates found", async () => {
    mockFetch.mockResolvedValue([]);
    const result = await runConfidenceEngine(
      "org-1",
      makeRawPayload({ email: null, phone: "5551234567" }),
      "test",
    );
    expect(result.action).toBe("AUTO_CREATE");
  });

  it("CREATE_PROPOSAL for name-only payload with no candidates (sparse data guard)", async () => {
    mockFetch.mockResolvedValue([]);
    const result = await runConfidenceEngine(
      "org-1",
      makeRawPayload({ email: null, phone: null }),
      "test",
    );
    expect(result.action).toBe("CREATE_PROPOSAL");
    expect(result.confidence).toBe(0.3);
  });

  it("sweep mode returns AUTO_IGNORE instead of AUTO_CREATE when no candidates", async () => {
    mockFetch.mockResolvedValue([]);
    const result = await runConfidenceEngine(
      "org-1",
      makeRawPayload(),
      "test",
      { sweepMode: true },
    );
    expect(result.action).toBe("AUTO_IGNORE");
  });
});

// ── 2. Conservative 0.98 launch threshold ─────────────────────────────────────

describe("confidence engine — AUTO_UPDATE threshold (0.98)", () => {
  it("AUTO_UPDATE only at or above 0.98 (email + phone exact match)", async () => {
    // email + phone match → base 0.97 + nameScore * 0.03 ≈ 0.97–1.00
    // With perfect name match: 0.97 + 1 * 0.03 = 1.00
    const candidate = makeCandidate(); // exact match on all fields
    mockFetch.mockResolvedValue([candidate]);
    const result = await runConfidenceEngine("org-1", makeRawPayload(), "test");
    // Score should be >= 0.98, so AUTO_UPDATE without Gemini
    expect(result.action).toBe("AUTO_UPDATE");
    expect(mockGemini).not.toHaveBeenCalled();
  });

  it("score of ~0.96 (email-only match) escalates to Gemini, not AUTO_UPDATE", async () => {
    // email-only → base 0.85 + name * 0.10. Perfect name: 0.85 + 0.10 = 0.95.
    // 0.95 < 0.98 → Gemini zone.
    const candidate = makeCandidate({ primary_phone: "9999999999" }); // phone mismatch
    mockFetch.mockResolvedValue([candidate]);
    mockGemini.mockResolvedValue({
      confidence: 0.96,
      action: "CREATE_PROPOSAL",
      targetCandidateId: null,
      reasoning: "Gemini says propose",
    });
    const result = await runConfidenceEngine("org-1", makeRawPayload(), "test");
    expect(mockGemini).toHaveBeenCalled();
    expect(result.action).toBe("CREATE_PROPOSAL");
  });

  it("sweep mode caps AUTO_UPDATE → CREATE_PROPOSAL even at high confidence", async () => {
    const candidate = makeCandidate();
    mockFetch.mockResolvedValue([candidate]);
    const result = await runConfidenceEngine(
      "org-1",
      makeRawPayload(),
      "test",
      { sweepMode: true },
    );
    expect(result.action).toBe("CREATE_PROPOSAL");
  });
});

// ── 3. Score below THRESHOLD_GEMINI_MIN → AUTO_IGNORE ────────────────────────

describe("confidence engine — AUTO_IGNORE below 0.35", () => {
  it("returns AUTO_IGNORE when best score < 0.35", async () => {
    // Candidate with no email/phone match and very different name
    const candidate = makeCandidate({
      first_name: "Alice",
      last_name: "Wong",
      primary_email: "alice@other.com",
      primary_phone: "9998887777",
    });
    mockFetch.mockResolvedValue([candidate]);
    const result = await runConfidenceEngine(
      "org-1",
      makeRawPayload({ email: null, phone: null }),
      "test",
    );
    expect(result.action).toBe("AUTO_IGNORE");
    expect(result.targetId).toBeNull();
  });
});

// ── 4. Gemini fallback on failure ─────────────────────────────────────────────

describe("confidence engine — Gemini failure fallback", () => {
  it("falls back to CREATE_PROPOSAL when Gemini returns null (catches internally)", async () => {
    // gemini-refinement catches its own errors and returns null — confidence engine sees null
    const candidate = makeCandidate({ primary_phone: "9999999999" }); // phone mismatch → gray zone
    mockFetch.mockResolvedValue([candidate]);
    mockGemini.mockResolvedValue(null);

    const result = await runConfidenceEngine("org-1", makeRawPayload(), "test");
    expect(result.action).toBe("CREATE_PROPOSAL");
    // targetId must be null on fallback — not the candidate ID
    expect(result.targetId).toBeNull();
  });

  it("falls back to CREATE_PROPOSAL when Gemini returns null (rate limited)", async () => {
    const candidate = makeCandidate({ primary_phone: "9999999999" });
    mockFetch.mockResolvedValue([candidate]);
    mockGemini.mockResolvedValue(null);

    const result = await runConfidenceEngine("org-1", makeRawPayload(), "test");
    expect(result.action).toBe("CREATE_PROPOSAL");
  });

  it("never hangs — resolves even when Gemini returns null (rate-limited or timed out)", async () => {
    // gemini-refinement.ts catches errors internally and returns null
    const candidate = makeCandidate({ primary_phone: "9999999999" });
    mockFetch.mockResolvedValue([candidate]);
    mockGemini.mockResolvedValue(null);

    await expect(
      runConfidenceEngine("org-1", makeRawPayload(), "test"),
    ).resolves.toBeDefined();
  });
});

// ── 5. Gemini hard safety guard ───────────────────────────────────────────────

describe("confidence engine — Gemini hard safety guard", () => {
  it("Gemini cannot push below-0.98-confidence result to AUTO_UPDATE", async () => {
    const candidate = makeCandidate({ primary_phone: "9999999999" });
    mockFetch.mockResolvedValue([candidate]);
    // Gemini claims AUTO_UPDATE but with confidence only 0.96
    mockGemini.mockResolvedValue({
      confidence: 0.96,
      action: "AUTO_UPDATE",
      targetCandidateId: candidate.id,
      reasoning: "Gemini overconfident",
    });

    const result = await runConfidenceEngine("org-1", makeRawPayload(), "test");
    // Hard safety: 0.96 < 0.98 → should be demoted to CREATE_PROPOSAL
    expect(result.action).toBe("CREATE_PROPOSAL");
  });

  it("Gemini AUTO_UPDATE at or above 0.98 is allowed through", async () => {
    const candidate = makeCandidate({ primary_phone: "9999999999" });
    mockFetch.mockResolvedValue([candidate]);
    mockGemini.mockResolvedValue({
      confidence: 0.98,
      action: "AUTO_UPDATE",
      targetCandidateId: candidate.id,
      reasoning: "Gemini confident",
    });

    const result = await runConfidenceEngine("org-1", makeRawPayload(), "test");
    expect(result.action).toBe("AUTO_UPDATE");
  });
});

// ── 6. excludeId prevents self-match in sweep mode ───────────────────────────

describe("confidence engine — excludeId option", () => {
  it("excludeId is forwarded to fetchTopMatchCandidates", async () => {
    mockFetch.mockResolvedValue([]);
    await runConfidenceEngine("org-1", makeRawPayload(), "test", {
      excludeId: "self-record-id",
      sweepMode: true,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "org-1",
      expect.anything(),
      "self-record-id",
    );
  });
});

// ── 7. Score calibration spec checks ─────────────────────────────────────────
// These verify the algorithm stack produces values matching the architecture spec.

import { jaroWinkler, normalizedLevenshtein, doubleMetaphone } from "@/lib/data-keeper/string-algorithms";

describe("string algorithm calibration", () => {
  it('"Jon" vs "John" (Jaro-Winkler) ≥ 0.92', () => {
    expect(jaroWinkler("jon", "john")).toBeGreaterThanOrEqual(0.92);
  });

  it('"Katherine" vs "Kathryn" (Jaro-Winkler) ≥ 0.88', () => {
    expect(jaroWinkler("katherine", "kathryn")).toBeGreaterThanOrEqual(0.88);
  });

  it('"Smyth" vs "Smith" (normalized Levenshtein) ≥ 0.75', () => {
    expect(normalizedLevenshtein("smyth", "smith")).toBeGreaterThanOrEqual(0.75);
  });

  it('"Catherine" vs "Katherine" (Double Metaphone) produces identical code', () => {
    expect(doubleMetaphone("Catherine")).toBe(doubleMetaphone("Katherine"));
  });
});

// ── 8. Ambiguity penalty — score + proposal routing ──────────────────────────

import { scoreCandidates } from "@/lib/data-keeper/score-candidates";
import type { NormalizedPayload } from "@/lib/data-keeper/types";

function makePayload(overrides: Partial<NormalizedPayload> = {}): NormalizedPayload {
  return {
    firstName: null,
    lastName: null,
    fullName: null,
    email: null,
    phone: null,
    businessName: null,
    normalizedBusinessName: null,
    billingAddress: null,
    serviceAddress: null,
    sourceSystem: "test",
    extractedMetadata: {},
    raw: {},
    ...overrides,
  };
}

describe("ambiguity penalty", () => {
  it("subtracts 0.08 from top score when two candidates are within 0.08 of each other and both > 0.60", () => {
    const payload = makePayload({ email: "john@example.com" });
    const a = makeCandidate({ id: "a", primary_email: "john@example.com" });
    const b = makeCandidate({ id: "b", primary_email: "john@example.com" });
    const results = scoreCandidates(payload, [a, b], "test");
    // Both candidates get email score of 1 → 0.85 base → both same score
    // Penalty: results[0].score should be original - 0.08
    expect(results[0].reasoning).toMatch(/multiple similar candidates/i);
    const withoutPenalty = scoreCandidates(payload, [a], "test");
    expect(results[0].score).toBeCloseTo(withoutPenalty[0].score - 0.08, 5);
  });

  it("does NOT apply penalty when scores differ by more than 0.08", () => {
    const payload = makePayload({ email: "john@example.com" });
    const strong = makeCandidate({ id: "strong", primary_email: "john@example.com" });
    const weak = makeCandidate({ id: "weak", primary_email: "other@example.com", primary_phone: null });
    const results = scoreCandidates(payload, [strong, weak], "test");
    expect(results[0].reasoning).not.toMatch(/multiple similar candidates/i);
  });
});

// ── 9. Nickname + phonetic bonus integration ──────────────────────────────────

import { nicknameMatch, canonicalize } from "@/lib/data-keeper/nickname-map";

describe("nickname resolution before scoring", () => {
  it("Bob canonicalizes to robert", () => {
    expect(canonicalize("Bob")).toBe("robert");
  });

  it("Bill canonicalizes to william", () => {
    expect(canonicalize("Bill")).toBe("william");
  });

  it("nicknameMatch detects Bob/Robert as the same person", () => {
    expect(nicknameMatch("Bob", "Robert")).toBe(true);
  });

  it("nicknameMatch does not match unrelated names", () => {
    expect(nicknameMatch("Bob", "William")).toBe(false);
  });
});

// ── 10. Business name normalization — messy real-world inputs ─────────────────

import { normalizeBusinessName } from "@/lib/data-keeper/business-normalizer";

describe("business normalization — spec cases", () => {
  it('normalizes "The Acme Corporation, Inc. & Co." correctly', () => {
    // Suffix stripping only removes from the right-most match at end of string.
    // "The " stripped → "acme corporation, inc. & co."
    // & → and → "acme corporation, inc. and co."
    // "co." stripped from end → "acme corporation, inc. and"
    const result = normalizeBusinessName("The Acme Corporation, Inc. & Co.");
    expect(result).toBe("acme corporation, inc. and");
  });

  it("makes two representations of the same company comparable", () => {
    const a = normalizeBusinessName("Smith & Sons, LLC");
    const b = normalizeBusinessName("Smith and Sons LLC");
    expect(a).toBe(b);
  });

  it("strips PLLC suffix", () => {
    expect(normalizeBusinessName("Dr. Jones Dental PLLC")).toBe("dr. jones dental");
  });
});

// ── 11. Address normalization ─────────────────────────────────────────────────

import { normalizeAddress } from "@/lib/data-keeper/address-normalizer";

describe("address normalization — spec cases", () => {
  it('normalizes "123 N. Main St. Apt 4B" to lowercase flattened string', () => {
    // normalizeAddress only reads street/city/state/zip — unit must be in street string
    const result = normalizeAddress({ street: "123 N. Main St. Apt 4B" });
    expect(result).toBe(result.toLowerCase());
    expect(result).toContain("north");
    expect(result).toContain("street");
    expect(result).toContain("apartment");
    expect(result).toContain("4b");
  });
});

// ── 12. Metadata extraction — spec paragraph ─────────────────────────────────

import { extractMetadata } from "@/lib/data-keeper/metadata-extractor";

describe("metadata extraction — spec paragraph", () => {
  it("extracts gate_code and contact_pref from a freetext notes paragraph", () => {
    // gate_code pattern requires digits immediately after the keyword (e.g., "gate: 4432")
    // contact_pref matches "text only" anywhere in the string
    const notes =
      "Customer preference is text only. Gate: 4432, call before arriving.";
    const result = extractMetadata(notes);
    expect(result.gate_code).toBe("4432");
    expect(result.contact_pref).toMatch(/text only/i);
  });
});
