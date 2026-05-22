import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { GEMINI_MODEL } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import type { NormalizedPayload, ScoredMatch, DataKeeperAction } from "./types";

const SYSTEM_PROMPT = `You are a data reconciliation assistant for a CRM platform. Your job is to decide whether an incoming customer record should be automatically merged with an existing record, staged as a proposal for human review, or ignored.

The deterministic matching engine has already computed signal scores (email match, phone match, name similarity). Trust these scores as ground truth. Your role is to apply judgment for genuinely ambiguous cases.

Rules:
- If email matches exactly, that is very strong evidence of the same person.
- If phone matches exactly with high name similarity, that is strong evidence.
- Name similarity alone (without email or phone) is insufficient for auto-merge.
- When in doubt, return CREATE_PROPOSAL — it is always safer.
- Never return AUTO_UPDATE unless you are confident this is the same real-world person.
- Your reasoning must be specific: reference the actual field values that informed your decision.
- Return valid JSON only. No markdown, no explanation outside the JSON object.`;

const GeminiResponseSchema = z.object({
  confidence: z.number().min(0).max(1),
  action: z.enum(["AUTO_UPDATE", "CREATE_PROPOSAL", "AUTO_IGNORE"]),
  targetCandidateId: z.string().nullable(),
  reasoning: z.string(),
});

type GeminiResponse = z.infer<typeof GeminiResponseSchema>;

export async function geminiRefinement(
  organizationId: string,
  payload: NormalizedPayload,
  topCandidates: ScoredMatch[],
  deterministicConfidence: number,
  candidateDetails: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    primary_email: string | null;
    primary_phone: string | null;
  }>,
): Promise<GeminiResponse | null> {
  // Rate limit: max 30 Gemini calls per org per minute
  const allowed = await rateLimit(`gemini-keeper:${organizationId}`, 30, 60_000);
  if (!allowed) return null;

  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;

  const genAI = new GoogleGenAI({ apiKey });

  // Build candidate context — merge scored data with actual field values
  const candidateContext = topCandidates.slice(0, 3).map((match) => {
    const detail = candidateDetails.find((d) => d.id === match.candidateId);
    return {
      id: match.candidateId,
      firstName: detail?.first_name ?? null,
      lastName: detail?.last_name ?? null,
      email: detail?.primary_email ?? null,
      phone: detail?.primary_phone ?? null,
      deterministicScore: Math.round(match.score * 100) / 100,
      signals: match.signals,
      fieldDelta: match.fieldDelta,
    };
  });

  const prompt = JSON.stringify({
    task: "data_reconciliation",
    incoming: {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      businessName: payload.businessName,
    },
    topCandidates: candidateContext,
    deterministicConfidence,
  });

  try {
    const result = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0,
      },
    });

    const text = result.text ?? "";
    const parsed = JSON.parse(text);
    return GeminiResponseSchema.parse(parsed);
  } catch {
    return null;
  }
}

// Deterministic fallback reasoning when Gemini is unavailable.
export function deterministicReasoning(
  match: ScoredMatch,
  action: DataKeeperAction,
): string {
  return `${match.reasoning} Action: ${action} (deterministic fallback — Gemini unavailable).`;
}
