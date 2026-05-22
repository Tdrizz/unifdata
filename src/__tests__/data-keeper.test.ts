import { describe, it, expect } from "vitest";

// ── String Algorithms ──────────────────────────────────────────────────────────

import {
  jaroWinkler,
  trigramSimilarity,
  normalizedLevenshtein,
  doubleMetaphone,
  phoneticMatch,
  nameSimilarity,
} from "@/lib/data-keeper/string-algorithms";

describe("jaroWinkler", () => {
  it("returns 1 for identical strings", () => {
    expect(jaroWinkler("john", "john")).toBe(1);
  });

  it("returns 0 for empty vs non-empty", () => {
    expect(jaroWinkler("", "john")).toBe(0);
    expect(jaroWinkler("john", "")).toBe(0);
  });

  it("scores near-identical names high", () => {
    expect(jaroWinkler("jon", "john")).toBeGreaterThan(0.9);
    expect(jaroWinkler("katherine", "kathryn")).toBeGreaterThan(0.88);
  });

  it("scores clearly different names low", () => {
    expect(jaroWinkler("smith", "jones")).toBeLessThan(0.75);
    expect(jaroWinkler("alice", "zhang")).toBeLessThan(0.6);
  });

  it("handles prefix agreement bonus", () => {
    const withPrefix = jaroWinkler("johnathan", "john");
    const noPrefix = jaroWinkler("ohnathan", "john");
    expect(withPrefix).toBeGreaterThan(noPrefix);
  });
});

describe("trigramSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(trigramSimilarity("hello", "hello")).toBe(1);
  });

  it("returns 0 for empty string", () => {
    expect(trigramSimilarity("", "hello")).toBe(0);
    expect(trigramSimilarity("hello", "")).toBe(0);
  });

  it("scores similar strings high", () => {
    expect(trigramSimilarity("smith", "smiths")).toBeGreaterThanOrEqual(0.5);
    expect(trigramSimilarity("johnson", "johnston")).toBeGreaterThan(0.55);
  });

  it("scores dissimilar strings low", () => {
    expect(trigramSimilarity("abc", "xyz")).toBeLessThan(0.2);
  });
});

describe("normalizedLevenshtein", () => {
  it("returns 1 for identical strings", () => {
    expect(normalizedLevenshtein("smith", "smith")).toBe(1);
  });

  it("returns 0 for completely different strings of same length", () => {
    expect(normalizedLevenshtein("abc", "xyz")).toBe(0);
  });

  it("returns 0 when one string is empty", () => {
    expect(normalizedLevenshtein("", "abc")).toBe(0);
    expect(normalizedLevenshtein("abc", "")).toBe(0);
  });

  it("handles one-character typo", () => {
    expect(normalizedLevenshtein("smyth", "smith")).toBeGreaterThan(0.75);
  });

  it("scores transposition errors reasonably", () => {
    expect(normalizedLevenshtein("brian", "brain")).toBeGreaterThanOrEqual(0.6);
  });
});

describe("doubleMetaphone", () => {
  it("encodes common name variants the same way", () => {
    expect(doubleMetaphone("Catherine")).toBe(doubleMetaphone("Katherine")); // both K0RN
    expect(doubleMetaphone("Meyers")).toBe(doubleMetaphone("Myers"));        // both MARS
    expect(doubleMetaphone("Smith")).toBe(doubleMetaphone("Smyth"));         // both SM0
  });

  it("returns empty string for empty input", () => {
    expect(doubleMetaphone("")).toBe("");
  });

  it("produces different codes for clearly different names", () => {
    expect(doubleMetaphone("Smith")).not.toBe(doubleMetaphone("Jones"));
    expect(doubleMetaphone("Allen")).not.toBe(doubleMetaphone("Brown"));
  });

  it("handles silent initial letters (KN, WR, GN)", () => {
    const kn = doubleMetaphone("Knight");
    const n = doubleMetaphone("Night");
    expect(kn).toBe(n);
  });
});

describe("phoneticMatch", () => {
  it("matches phonetically equivalent names", () => {
    expect(phoneticMatch("Catherine", "Katherine")).toBe(true);
    expect(phoneticMatch("Smith", "Smyth")).toBe(true);
    expect(phoneticMatch("Meyers", "Myers")).toBe(true);
  });

  it("does not match clearly different names", () => {
    expect(phoneticMatch("Smith", "Jones")).toBe(false);
  });

  it("returns false for empty strings", () => {
    expect(phoneticMatch("", "Smith")).toBe(false);
    expect(phoneticMatch("Smith", "")).toBe(false);
  });
});

describe("nameSimilarity", () => {
  it("returns 1 for identical names", () => {
    expect(nameSimilarity("john smith", "john smith")).toBe(1);
  });

  it("returns 0 for null/empty inputs", () => {
    expect(nameSimilarity("", "john")).toBe(0);
    expect(nameSimilarity("john", "")).toBe(0);
  });

  it("takes the best score across algorithms", () => {
    const score = nameSimilarity("jon", "john");
    expect(score).toBeGreaterThanOrEqual(jaroWinkler("jon", "john"));
    expect(score).toBeGreaterThanOrEqual(trigramSimilarity("jon", "john"));
  });
});

// ── Name Parser ────────────────────────────────────────────────────────────────

import { parseName, toTitleCase } from "@/lib/data-keeper/name-parser";

describe("parseName", () => {
  it("parses standard first last", () => {
    const r = parseName("John Smith");
    expect(r.firstName).toBe("John");
    expect(r.lastName).toBe("Smith");
    expect(r.isInitialOnly).toBe(false);
  });

  it("handles comma-swap format", () => {
    const r = parseName("Smith, John");
    expect(r.firstName).toBe("John");
    expect(r.lastName).toBe("Smith");
  });

  it("detects initial-only first name", () => {
    const r = parseName("J. Smith");
    expect(r.firstName).toBe("J");
    expect(r.lastName).toBe("Smith");
    expect(r.isInitialOnly).toBe(true);
  });

  it("strips suffix Jr.", () => {
    const r = parseName("John Smith Jr.");
    expect(r.firstName).toBe("John");
    expect(r.lastName).toBe("Smith");
  });

  it("strips suffix III", () => {
    const r = parseName("John Smith III");
    expect(r.firstName).toBe("John");
    expect(r.lastName).toBe("Smith");
  });

  it("strips middle name", () => {
    const r = parseName("John Michael Smith");
    expect(r.firstName).toBe("John");
    expect(r.lastName).toBe("Smith");
  });

  it("normalizes ALL CAPS to Title Case", () => {
    const r = parseName("JOHN SMITH");
    expect(r.firstName).toBe("John");
    expect(r.lastName).toBe("Smith");
  });

  it("returns nulls for empty string", () => {
    const r = parseName("");
    expect(r.firstName).toBeNull();
    expect(r.lastName).toBeNull();
  });

  it("handles single name token", () => {
    const r = parseName("Madonna");
    expect(r.firstName).toBe("Madonna");
    expect(r.lastName).toBeNull();
  });
});

describe("toTitleCase", () => {
  it("converts all caps to title case", () => {
    expect(toTitleCase("JOHN SMITH")).toBe("John Smith");
  });

  it("converts lowercase to title case", () => {
    expect(toTitleCase("john smith")).toBe("John Smith");
  });
});

// ── Nickname Map ───────────────────────────────────────────────────────────────

import { canonicalize, nicknameMatch } from "@/lib/data-keeper/nickname-map";

describe("canonicalize", () => {
  it("resolves common nicknames to canonical form", () => {
    expect(canonicalize("bob")).toBe("robert");
    expect(canonicalize("bobby")).toBe("robert");
    expect(canonicalize("bill")).toBe("william");
    expect(canonicalize("liz")).toBe("elizabeth");
    expect(canonicalize("kate")).toBe("katherine");
    expect(canonicalize("jim")).toBe("james");
    expect(canonicalize("mike")).toBe("michael");
  });

  it("resolves canonical names to themselves", () => {
    expect(canonicalize("robert")).toBe("robert");
    expect(canonicalize("william")).toBe("william");
  });

  it("is case-insensitive", () => {
    expect(canonicalize("BOB")).toBe("robert");
    expect(canonicalize("Bob")).toBe("robert");
  });

  it("returns lowercased input for unknown names", () => {
    expect(canonicalize("XyzUnknown")).toBe("xyzunknown");
  });
});

describe("nicknameMatch", () => {
  it("matches nickname pairs correctly", () => {
    expect(nicknameMatch("Bob", "Robert")).toBe(true);
    expect(nicknameMatch("Liz", "Elizabeth")).toBe(true);
    expect(nicknameMatch("Kate", "Katherine")).toBe(true);
    expect(nicknameMatch("Jim", "James")).toBe(true);
    expect(nicknameMatch("Bill", "William")).toBe(true);
  });

  it("matches canonical to canonical", () => {
    expect(nicknameMatch("Robert", "Robert")).toBe(true);
  });

  it("does not match unrelated names", () => {
    expect(nicknameMatch("Bob", "James")).toBe(false);
    expect(nicknameMatch("Alice", "Elizabeth")).toBe(false);
  });
});

// ── Business Normalizer ────────────────────────────────────────────────────────

import { normalizeBusinessName } from "@/lib/data-keeper/business-normalizer";

describe("normalizeBusinessName", () => {
  it("strips LLC suffix", () => {
    expect(normalizeBusinessName("Acme Plumbing LLC")).toBe("acme plumbing");
  });

  it("strips Inc. suffix", () => {
    expect(normalizeBusinessName("Smith Services Inc.")).toBe("smith services");
  });

  it("strips Corp suffix", () => {
    expect(normalizeBusinessName("Global Corp")).toBe("global");
  });

  it("strips L.L.C. with dots", () => {
    expect(normalizeBusinessName("Best Roofing L.L.C.")).toBe("best roofing");
  });

  it("strips leading 'The '", () => {
    // "Group" is itself a legal suffix so "The Home Group" → "home"
    expect(normalizeBusinessName("The Home Group")).toBe("home");
    expect(normalizeBusinessName("The Northern Star")).toBe("northern star");
  });

  it("replaces & with and", () => {
    expect(normalizeBusinessName("Smith & Jones")).toBe("smith and jones");
  });

  it("strips apostrophes", () => {
    expect(normalizeBusinessName("McDonald's Cleaning")).toBe("mcdonalds cleaning");
  });

  it("expands abbreviations", () => {
    expect(normalizeBusinessName("Intl Mgmt Svcs")).toBe("international management services");
  });

  it("makes names comparable across formats", () => {
    const a = normalizeBusinessName("ACME Plumbing, LLC");
    const b = normalizeBusinessName("Acme Plumbing LLC");
    expect(a).toBe(b);
  });

  it("collapses extra whitespace", () => {
    expect(normalizeBusinessName("  Smith   Services  ")).toBe("smith services");
  });
});

// ── Metadata Extractor ─────────────────────────────────────────────────────────

import { extractMetadata } from "@/lib/data-keeper/metadata-extractor";

describe("extractMetadata", () => {
  it("returns empty object for null/undefined input", () => {
    expect(extractMetadata(null)).toEqual({});
    expect(extractMetadata(undefined)).toEqual({});
    expect(extractMetadata("")).toEqual({});
  });

  it("extracts gate code", () => {
    expect(extractMetadata("gate code: 1234").gate_code).toBe("1234");
    expect(extractMetadata("access #4567").gate_code).toBe("4567");
    expect(extractMetadata("entry code 9876").gate_code).toBe("9876");
  });

  it("extracts unit/suite", () => {
    expect(extractMetadata("unit 4B").unit).toBe("4B");
    expect(extractMetadata("Suite 200").unit).toBe("200");
    expect(extractMetadata("apt #3A").unit).toBe("3A");
  });

  it("extracts delivery note", () => {
    const r = extractMetadata("leave at back door");
    expect(r.delivery_note).toBe("back door");
  });

  it("extracts contact preference", () => {
    expect(extractMetadata("text only please").contact_pref).toBe("text only");
    expect(extractMetadata("no calls").contact_pref).toBe("no calls");
    expect(extractMetadata("email only").contact_pref).toBe("email only");
  });

  it("extracts referral source", () => {
    const r = extractMetadata("referred by John Smith");
    expect(r.referral_source).toBe("John Smith");
  });

  it("extracts phone extension", () => {
    expect(extractMetadata("call ext 123").phone_ext).toBe("123");
    expect(extractMetadata("extension 4567").phone_ext).toBe("4567");
    expect(extractMetadata("x 89").phone_ext).toBe("89");
  });

  it("extracts multiple fields from one string", () => {
    const r = extractMetadata("gate: 5678, unit 2C, text only");
    expect(r.gate_code).toBe("5678");
    expect(r.unit).toBe("2C");
    expect(r.contact_pref).toBeTruthy();
  });
});

// ── Address Normalizer ─────────────────────────────────────────────────────────

import { normalizeAddress } from "@/lib/data-keeper/address-normalizer";

describe("normalizeAddress", () => {
  it("expands street type abbreviations", () => {
    const r = normalizeAddress({ street: "123 Main St" });
    expect(r).toContain("street");
  });

  it("expands direction abbreviations", () => {
    const r = normalizeAddress({ street: "500 N Oak Ave" });
    expect(r).toContain("north");
  });

  it("expands unit type abbreviations", () => {
    const r = normalizeAddress({ street: "100 Pine Rd Apt 5" });
    expect(r).toContain("apartment");
  });

  it("strips zip+4 suffix", () => {
    const r = normalizeAddress({ zip: "12345-6789" });
    expect(r).toContain("12345");
    expect(r).not.toContain("6789");
  });

  it("lowercases output", () => {
    const r = normalizeAddress({ street: "123 MAIN ST", city: "SPRINGFIELD" });
    expect(r).toBe(r.toLowerCase());
  });
});

// ── Score Candidates ───────────────────────────────────────────────────────────

import { scoreCandidates } from "@/lib/data-keeper/score-candidates";
import type { NormalizedPayload, MasterCustomerCandidate } from "@/lib/data-keeper/types";

function makePayload(overrides: Partial<NormalizedPayload> = {}): NormalizedPayload {
  return {
    firstName: null,
    lastName: null,
    fullName: "",
    email: null,
    phone: null,
    businessName: null,
    normalizedBusinessName: null,
    extractedMetadata: {},
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<MasterCustomerCandidate> = {}): MasterCustomerCandidate {
  return {
    id: "cand-001",
    first_name: null,
    last_name: null,
    primary_email: null,
    primary_phone: null,
    billing_address: null,
    service_address: null,
    metadata: null,
    data_health_score: 50,
    ...overrides,
  };
}

describe("scoreCandidates", () => {
  it("returns empty array for empty candidates", () => {
    const result = scoreCandidates(makePayload({ email: "a@b.com" }), [], "test");
    expect(result).toHaveLength(0);
  });

  it("scores exact email match very high", () => {
    const payload = makePayload({ email: "john@example.com" });
    const candidate = makeCandidate({ primary_email: "john@example.com" });
    const [best] = scoreCandidates(payload, [candidate], "test");
    expect(best.score).toBeGreaterThanOrEqual(0.85);
  });

  it("scores email+phone match near max", () => {
    const payload = makePayload({ email: "john@example.com", phone: "5551234567" });
    const candidate = makeCandidate({
      primary_email: "john@example.com",
      primary_phone: "5551234567",
    });
    const [best] = scoreCandidates(payload, [candidate], "test");
    expect(best.score).toBeGreaterThanOrEqual(0.95);
  });

  it("scores phone-only match above 0.70", () => {
    const payload = makePayload({ phone: "5559876543" });
    const candidate = makeCandidate({ primary_phone: "5559876543" });
    const [best] = scoreCandidates(payload, [candidate], "test");
    expect(best.score).toBeGreaterThan(0.70);
  });

  it("scores mismatched email as 0 email signal", () => {
    const payload = makePayload({ email: "alice@example.com" });
    const candidate = makeCandidate({ primary_email: "bob@example.com" });
    const [best] = scoreCandidates(payload, [candidate], "test");
    expect(best.signals.email).toBe(0);
  });

  it("sorts candidates by score descending", () => {
    const payload = makePayload({ email: "john@example.com", phone: "5551234567" });
    const strong = makeCandidate({ id: "strong", primary_email: "john@example.com" });
    const weak = makeCandidate({ id: "weak", primary_email: "other@example.com" });
    const results = scoreCandidates(payload, [weak, strong], "test");
    expect(results[0].candidateId).toBe("strong");
  });

  it("applies ambiguity penalty when top two are close", () => {
    const payload = makePayload({ email: "john@example.com" });
    const a = makeCandidate({ id: "a", primary_email: "john@example.com" });
    const b = makeCandidate({ id: "b", primary_email: "john@example.com" });
    const results = scoreCandidates(payload, [a, b], "test");
    expect(results[0].reasoning).toContain("Multiple similar candidates");
  });

  it("applies QuickBooks email bonus", () => {
    const payload = makePayload({ email: "john@example.com" });
    const candidate = makeCandidate({ primary_email: "john@example.com" });
    const [withBonus] = scoreCandidates(payload, [candidate], "quickbooks");
    const [withoutBonus] = scoreCandidates(payload, [candidate], "hubspot");
    expect(withBonus.score).toBeGreaterThan(withoutBonus.score);
  });

  it("applies Jobber phone bonus", () => {
    const payload = makePayload({ phone: "5551112222" });
    const candidate = makeCandidate({ primary_phone: "5551112222" });
    const [withBonus] = scoreCandidates(payload, [candidate], "jobber");
    const [withoutBonus] = scoreCandidates(payload, [candidate], "test");
    expect(withBonus.score).toBeGreaterThan(withoutBonus.score);
  });

  it("builds fieldDelta for changed fields", () => {
    const payload = makePayload({
      firstName: "John",
      email: "john@new.com",
    });
    const candidate = makeCandidate({
      primary_email: "john@new.com",
      first_name: "Jon",
    });
    const [best] = scoreCandidates(payload, [candidate], "test");
    expect(best.fieldDelta.first_name).toEqual({ from: "Jon", to: "John" });
  });

  it("does not include unchanged fields in fieldDelta", () => {
    const payload = makePayload({ email: "same@example.com" });
    const candidate = makeCandidate({ primary_email: "same@example.com" });
    const [best] = scoreCandidates(payload, [candidate], "test");
    expect(best.fieldDelta.primary_email).toBeUndefined();
  });

  it("scores name-only match below 0.75 ceiling", () => {
    const payload = makePayload({ firstName: "John", lastName: "Smith", fullName: "John Smith" });
    const candidate = makeCandidate({ first_name: "John", last_name: "Smith" });
    const [best] = scoreCandidates(payload, [candidate], "test");
    expect(best.score).toBeLessThan(0.76);
    expect(best.score).toBeGreaterThan(0);
  });
});
