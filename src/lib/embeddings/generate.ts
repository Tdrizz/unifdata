// cspell:ignore genai
import { GoogleGenAI } from "@google/genai";

const EMBEDDING_MODEL = "text-embedding-004";
const EMBEDDING_DIMS = 768;

function getClient(): GoogleGenAI {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured.");
  return new GoogleGenAI({ apiKey });
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const genai = getClient();
  const result = await genai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });
  const values = result.embeddings?.[0]?.values;
  if (!values || values.length !== EMBEDDING_DIMS) {
    throw new Error(`Unexpected embedding dimension: ${values?.length ?? 0}`);
  }
  return values;
}

export function buildCustomerText(row: {
  name?: string | null;
  customer_type?: string | null;
  address?: string | null;
  notes?: string | null;
}): string {
  return [row.name, row.customer_type, row.address, row.notes]
    .filter(Boolean)
    .join(" | ");
}

export function buildJobText(row: {
  service_type?: string | null;
  status?: string | null;
  paid_status?: string | null;
  start_date?: string | null;
}): string {
  return [row.service_type, row.status, row.paid_status, row.start_date]
    .filter(Boolean)
    .join(" | ");
}

export function buildSaleText(row: {
  service_type?: string | null;
  payment_status?: string | null;
  sale_date?: string | null;
  source?: string | null;
}): string {
  return [row.service_type, row.payment_status, row.sale_date, row.source]
    .filter(Boolean)
    .join(" | ");
}
