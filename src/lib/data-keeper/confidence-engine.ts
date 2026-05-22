import { normalizePayload } from "./normalize-payload";
import { extractMetadata } from "./metadata-extractor";
import { fetchTopMatchCandidates } from "./pre-filter";
import { scoreCandidates } from "./score-candidates";
import { geminiRefinement, deterministicReasoning } from "./gemini-refinement";
import type {
  InboundPayload,
  DataKeeperDecision,
  MasterCustomerCandidate,
} from "./types";

const THRESHOLD_AUTO_UPDATE = 0.95;
const THRESHOLD_GEMINI_MIN = 0.35;

function hasIdentifier(payload: ReturnType<typeof normalizePayload>): boolean {
  return !!(payload.email || payload.phone);
}

export async function runConfidenceEngine(
  organizationId: string,
  rawPayload: InboundPayload,
  sourceSystem: string,
): Promise<DataKeeperDecision> {
  const normalized = normalizePayload(rawPayload);

  // Merge any additional metadata from notes
  const notesMeta = extractMetadata(rawPayload.notes);
  Object.assign(normalized.extractedMetadata, notesMeta);

  // Fetch top 5 candidates via pg_trgm SQL
  const candidates: MasterCustomerCandidate[] = await fetchTopMatchCandidates(
    organizationId,
    normalized,
  );

  // No candidates found
  if (candidates.length === 0) {
    if (hasIdentifier(normalized)) {
      return {
        action: "AUTO_CREATE",
        targetId: null,
        normalizedData: normalized,
        fieldDelta: {},
        confidence: 1.0,
        reasoning: "No existing records found. Creating new master customer record with normalized data.",
      };
    }
    return {
      action: "CREATE_PROPOSAL",
      targetId: null,
      normalizedData: normalized,
      fieldDelta: {},
      confidence: 0.30,
      reasoning:
        "No matching records found and no email or phone provided. Insufficient identifiers for auto-create — staged for review.",
    };
  }

  // Score all candidates
  const scored = scoreCandidates(normalized, candidates, sourceSystem);
  const best = scored[0];

  if (best.score < THRESHOLD_GEMINI_MIN) {
    return {
      action: "AUTO_IGNORE",
      targetId: null,
      normalizedData: normalized,
      fieldDelta: {},
      confidence: best.score,
      reasoning: `${best.reasoning} Score too low for any action.`,
    };
  }

  // High confidence — auto-update without Gemini
  if (best.score >= THRESHOLD_AUTO_UPDATE) {
    return {
      action: "AUTO_UPDATE",
      targetId: best.candidateId,
      normalizedData: normalized,
      fieldDelta: best.fieldDelta,
      confidence: best.score,
      reasoning: best.reasoning,
    };
  }

  // Gray zone — escalate to Gemini
  const geminiResult = await geminiRefinement(
    organizationId,
    normalized,
    scored,
    best.score,
    candidates.map((c) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      primary_email: c.primary_email,
      primary_phone: c.primary_phone,
    })),
  );

  if (geminiResult) {
    const targetId =
      geminiResult.targetCandidateId ??
      (geminiResult.action === "AUTO_UPDATE" ? best.candidateId : null);

    // Hard safety: Gemini cannot push below-threshold scores to AUTO_UPDATE
    const action =
      geminiResult.confidence >= THRESHOLD_AUTO_UPDATE
        ? geminiResult.action
        : "CREATE_PROPOSAL";

    return {
      action,
      targetId,
      normalizedData: normalized,
      fieldDelta: best.fieldDelta,
      confidence: geminiResult.confidence,
      reasoning: geminiResult.reasoning,
    };
  }

  // Gemini unavailable — deterministic fallback
  const fallbackAction =
    best.score >= 0.80 ? "CREATE_PROPOSAL" : "CREATE_PROPOSAL";
  return {
    action: fallbackAction,
    targetId: best.candidateId,
    normalizedData: normalized,
    fieldDelta: best.fieldDelta,
    confidence: best.score,
    reasoning: deterministicReasoning(best, fallbackAction),
  };
}
