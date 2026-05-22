import { normalizePhone, normalizeEmail } from "@/lib/normalize";
import {
  jaroWinkler,
  trigramSimilarity,
  normalizedLevenshtein,
  phoneticMatch,
} from "./string-algorithms";
import { canonicalize, nicknameMatch } from "./nickname-map";
import { normalizeBusinessName } from "./business-normalizer";
import type {
  MasterCustomerCandidate,
  NormalizedPayload,
  ScoredMatch,
  SignalScores,
  FieldDelta,
} from "./types";

// Returns the best name similarity across all algorithms, with phonetic and nickname bonuses.
function scoreNames(
  incomingFirst: string | null,
  incomingLast: string | null,
  candidateFirst: string | null,
  candidateLast: string | null,
): { score: number; phoneticBonus: boolean; nicknameBonus: boolean } {
  const inFull = [incomingFirst, incomingLast].filter(Boolean).join(" ").toLowerCase();
  const cFull = [candidateFirst, candidateLast].filter(Boolean).join(" ").toLowerCase();

  if (!inFull || !cFull) return { score: 0, phoneticBonus: false, nicknameBonus: false };

  // Full name composite score
  const fullScore = Math.max(
    jaroWinkler(inFull, cFull),
    trigramSimilarity(inFull, cFull),
    normalizedLevenshtein(inFull, cFull),
  );

  // Last-name-only score (often more reliable than full name)
  let lastScore = 0;
  if (incomingLast && candidateLast) {
    lastScore = Math.max(
      jaroWinkler(incomingLast.toLowerCase(), candidateLast.toLowerCase()),
      trigramSimilarity(incomingLast.toLowerCase(), candidateLast.toLowerCase()),
    );
  }

  // First name comparisons using canonical forms
  let firstScore = 0;
  let nicknameBonus = false;
  if (incomingFirst && candidateFirst) {
    const canonIn = canonicalize(incomingFirst);
    const canonCand = canonicalize(candidateFirst);
    firstScore = Math.max(
      jaroWinkler(canonIn, canonCand),
      trigramSimilarity(canonIn, canonCand),
    );
    if (nicknameMatch(incomingFirst, candidateFirst)) {
      nicknameBonus = true;
      firstScore = Math.max(firstScore, 0.92);
    }
    // Initial-only match: "J" vs "John"
    if (
      incomingFirst.length === 1 &&
      candidateFirst.toLowerCase().startsWith(incomingFirst.toLowerCase())
    ) {
      firstScore = Math.max(firstScore, 0.75);
    }
  }

  // Phonetic bonus on last name
  let phoneticBonus = false;
  if (incomingLast && candidateLast && phoneticMatch(incomingLast, candidateLast)) {
    phoneticBonus = true;
  }

  // Weighted combination
  const nameScore =
    incomingFirst && incomingLast
      ? firstScore * 0.35 + lastScore * 0.45 + fullScore * 0.20
      : Math.max(fullScore, lastScore, firstScore);

  const bonus = (phoneticBonus ? 0.10 : 0) + (nicknameBonus ? 0 : 0);
  return {
    score: Math.min(1, nameScore + bonus),
    phoneticBonus,
    nicknameBonus,
  };
}

function buildFieldDelta(
  payload: NormalizedPayload,
  candidate: MasterCustomerCandidate,
): FieldDelta {
  const delta: FieldDelta = {};

  if (payload.firstName !== null && payload.firstName !== candidate.first_name) {
    delta.first_name = { from: candidate.first_name, to: payload.firstName };
  }
  if (payload.lastName !== null && payload.lastName !== candidate.last_name) {
    delta.last_name = { from: candidate.last_name, to: payload.lastName };
  }
  if (payload.email !== null && payload.email !== candidate.primary_email) {
    delta.primary_email = { from: candidate.primary_email, to: payload.email };
  }
  if (payload.phone !== null && payload.phone !== candidate.primary_phone) {
    delta.primary_phone = { from: candidate.primary_phone, to: payload.phone };
  }
  if (
    payload.businessName !== null &&
    payload.businessName !== candidate.metadata?.business_name
  ) {
    delta["metadata.business_name"] = {
      from: candidate.metadata?.business_name ?? null,
      to: payload.businessName,
    };
  }

  return delta;
}

function generateReasoning(
  signals: SignalScores,
  score: number,
  phoneticBonus: boolean,
  nicknameBonus: boolean,
  ambiguityPenaltyApplied: boolean,
): string {
  const parts: string[] = [];

  if (signals.email === 1) parts.push("email (exact match)");
  if (signals.phone === 1) parts.push("phone (exact match)");
  if (signals.name !== undefined && signals.name > 0) {
    const pct = Math.round(signals.name * 100);
    let nameNote = `name (${pct}% similarity`;
    if (phoneticBonus) nameNote += ", phonetic match";
    if (nicknameBonus) nameNote += ", nickname variant";
    nameNote += ")";
    parts.push(nameNote);
  }
  if (signals.businessName !== undefined && signals.businessName > 0) {
    parts.push(`business name (${Math.round(signals.businessName * 100)}% similarity)`);
  }

  const matchedOn = parts.length > 0 ? `Matched on: ${parts.join(", ")}.` : "No strong match signals.";
  const confidence = `Confidence: ${Math.round(score * 100)}%.`;
  const penalty = ambiguityPenaltyApplied
    ? " Multiple similar candidates found — confidence reduced."
    : "";

  return `${matchedOn} ${confidence}${penalty}`;
}

// Source-system authoritative bonuses.
function sourceBonus(source: string, signals: SignalScores): number {
  if (source === "quickbooks" && signals.email === 1) return 0.03;
  if (source === "jobber" && signals.phone === 1) return 0.02;
  return 0;
}

function computeScore(signals: SignalScores, sourceSystem: string): number {
  const { email = 0, phone = 0, name = 0, businessName = 0 } = signals;

  let base = 0;

  if (email === 1 && phone === 1) {
    base = 0.97 + name * 0.03;
  } else if (email === 1) {
    base = 0.85 + name * 0.10 + phone * 0.05;
  } else if (phone === 1) {
    base = 0.72 + name * 0.20;
  } else if (name >= 0.90) {
    base = name * 0.75;
  } else if (businessName >= 0.80) {
    base = businessName * 0.72;
  } else if (name > 0) {
    base = name * 0.55;
  }

  return Math.min(1, base + sourceBonus(sourceSystem, signals));
}

export function scoreCandidates(
  payload: NormalizedPayload,
  candidates: MasterCustomerCandidate[],
  sourceSystem: string,
): ScoredMatch[] {
  const results: ScoredMatch[] = [];

  for (const candidate of candidates) {
    const signals: SignalScores = {};

    // Email signal
    if (payload.email && candidate.primary_email) {
      signals.email = normalizeEmail(payload.email) === normalizeEmail(candidate.primary_email) ? 1 : 0;
    }

    // Phone signal
    if (payload.phone && candidate.primary_phone) {
      signals.phone = normalizePhone(payload.phone) === normalizePhone(candidate.primary_phone) ? 1 : 0;
    }

    // Name signal
    const { score: nameScore, phoneticBonus, nicknameBonus } = scoreNames(
      payload.firstName,
      payload.lastName,
      candidate.first_name,
      candidate.last_name,
    );
    if (payload.firstName || payload.lastName) {
      signals.name = nameScore;
    }

    // Business name signal
    if (payload.normalizedBusinessName) {
      const candBusiness = candidate.metadata?.business_name as string | undefined;
      if (candBusiness) {
        signals.businessName = trigramSimilarity(
          payload.normalizedBusinessName,
          normalizeBusinessName(candBusiness),
        );
      }
    }

    const rawScore = computeScore(signals, sourceSystem);
    const fieldDelta = buildFieldDelta(payload, candidate);

    results.push({
      candidateId: candidate.id,
      score: rawScore,
      signals,
      fieldDelta,
      // placeholder reasoning — ambiguity penalty applied after all candidates scored
      reasoning: generateReasoning(signals, rawScore, phoneticBonus, nicknameBonus, false),
    });
  }

  // Sort descending
  results.sort((a, b) => b.score - a.score);

  // Ambiguity penalty: if top two both > 0.60 and within 0.08 of each other
  if (
    results.length >= 2 &&
    results[0].score > 0.60 &&
    results[1].score > 0.60 &&
    results[0].score - results[1].score < 0.08
  ) {
    results[0] = {
      ...results[0],
      score: Math.max(0, results[0].score - 0.08),
      reasoning: results[0].reasoning + " Multiple similar candidates — confidence reduced.",
    };
  }

  return results;
}
