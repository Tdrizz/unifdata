import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
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

const AiRefinementResponseSchema = z.object({
  confidence: z.number().min(0).max(1),
  action: z.enum(["AUTO_UPDATE", "CREATE_PROPOSAL", "AUTO_IGNORE"]),
  targetCandidateId: z.string().nullable(),
  reasoning: z.string(),
});

type AiRefinementResponse = z.infer<typeof AiRefinementResponseSchema>;

export async function aiRefinement(
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
): Promise<AiRefinementResponse | null> {
  // Rate limit: max 30 AI refinement calls per org per minute
  const allowed = await rateLimit(`data-keeper-refinement:${organizationId}`, 30, 60_000);
  if (!allowed) return null;

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
    const response = await aiRouter.chat.completions.create({
      model: AI_MODELS.dataQuality,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text);
    return AiRefinementResponseSchema.parse(parsed);
  } catch (err) {
    console.error("[data-keeper.ai-refinement] AI call failed, falling back to deterministic reasoning", err);
    Sentry.captureException(err, {
      tags: { module: "data-keeper", phase: "ai-refinement" },
      extra: { organizationId },
    });
    return null;
  }
}

// Deterministic fallback reasoning when the AI call fails or is unavailable.
export function deterministicReasoning(
  match: ScoredMatch,
  action: DataKeeperAction,
): string {
  return `${match.reasoning} Action: ${action} (deterministic fallback — AI unavailable).`;
}
