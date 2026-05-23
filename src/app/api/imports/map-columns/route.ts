import { NextResponse } from "next/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import { rateLimit } from "@/lib/rate-limit";
import { aiRouter } from "@/lib/ai/router";
import { importFieldDefinitions } from "@/lib/import-engine-fields";
import type { ImportRecordType } from "@/lib/import-engine-fields";
import { buildFuzzyMapping } from "@/lib/imports/fuzzy-mapper";
import type { ColumnMapping } from "@/lib/imports/fuzzy-mapper";

const VALID_RECORD_TYPES = new Set<ImportRecordType>([
  "relationships",
  "opportunities",
  "work",
  "revenue",
  "actions",
]);

type RequestBody = {
  headers: string[];
  recordType: string;
  sampleRows?: Record<string, string>[];
};

export async function POST(request: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "AI service not configured." }, { status: 500 });
  }

  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!await rateLimit(`import-map:${companyId}`, 30)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { headers, recordType, sampleRows = [] } = body;

  if (!Array.isArray(headers) || headers.length === 0) {
    return NextResponse.json({ error: "headers array is required." }, { status: 400 });
  }

  if (!VALID_RECORD_TYPES.has(recordType as ImportRecordType)) {
    return NextResponse.json({ error: "Invalid recordType." }, { status: 400 });
  }

  const fields = importFieldDefinitions[recordType as ImportRecordType];

  // Always start with a fast fuzzy pass — AI fills in low-confidence gaps.
  const fuzzyMapping = buildFuzzyMapping(
    headers,
    fields.map((f) => ({ key: f.key, label: f.label })),
  );

  // Skip AI if every field has high confidence (≥0.85)
  const lowConfidenceFields = fields.filter(
    (f) => !fuzzyMapping[f.key] || fuzzyMapping[f.key].confidence < 0.85,
  );

  if (lowConfidenceFields.length === 0) {
    return NextResponse.json({ mapping: fuzzyMapping });
  }

  // Ask AI only about unmapped/low-confidence fields
  const fieldDescriptions = lowConfidenceFields
    .map((f) => `  - "${f.key}" (${f.label}${f.required ? ", required" : ""})`)
    .join("\n");

  const samplePreview = sampleRows
    .slice(0, 3)
    .map((row) =>
      Object.entries(row)
        .slice(0, 8)
        .map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`)
        .join(" | "),
    )
    .join("\n");

  const systemPrompt = `You are a data import assistant. Given column headers from a user's spreadsheet and the target fields for a ${recordType} import, return the best column-to-field mapping as JSON.

Return ONLY a JSON object in this exact shape:
{
  "mapping": {
    "<field_key>": { "column": "<header_name_or_null>", "confidence": <0.0-1.0> }
  }
}

Rules:
- Only include fields that have a matching header. Set "column" to null if no match.
- confidence 1.0 = exact match, 0.7 = strong synonym, 0.5 = plausible guess, 0.0 = no match.
- Never invent column names. Only use names from the provided headers array.
- Each header may only be used once.`;

  const userMessage = `Headers: ${JSON.stringify(headers)}

Fields to map:
${fieldDescriptions}

${samplePreview ? `Sample data preview:\n${samplePreview}` : ""}`;

  try {
    const response = await aiRouter.chat.completions.create({
      model: "openai/gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let aiResult: { mapping?: Record<string, { column: string | null; confidence: number }> };

    try {
      aiResult = JSON.parse(raw);
    } catch {
      return NextResponse.json({ mapping: fuzzyMapping });
    }

    if (!aiResult.mapping || typeof aiResult.mapping !== "object") {
      return NextResponse.json({ mapping: fuzzyMapping });
    }

    // Merge: AI result overrides fuzzy for low-confidence fields, keep high-confidence fuzzy matches
    const finalMapping: ColumnMapping = { ...fuzzyMapping };

    for (const [fieldKey, candidate] of Object.entries(aiResult.mapping)) {
      if (!candidate || !candidate.column) continue;
      if (!headers.includes(candidate.column)) continue;

      const existing = finalMapping[fieldKey];
      const aiConf = Math.min(1, Math.max(0, Number(candidate.confidence) || 0));

      if (!existing || aiConf > existing.confidence) {
        finalMapping[fieldKey] = {
          column: candidate.column,
          confidence: aiConf,
        };
      }
    }

    return NextResponse.json({ mapping: finalMapping });
  } catch {
    // Fall back to fuzzy mapping if AI call fails
    return NextResponse.json({ mapping: fuzzyMapping });
  }
}
