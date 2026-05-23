import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: { "HTTP-Referer": "https://unifdata.com" },
});

export const AI_MODELS = {
  manager: "openai/gpt-4o-mini",
  chat: "nousresearch/hermes-3-llama-3.1-70b",
  outreach: "anthropic/claude-3.5-sonnet",
  revenue: "openai/gpt-4o",
  dataQuality: "google/gemini-flash-1.5",
  alertFormatter: "nousresearch/hermes-3-llama-3.1-8b",
} as const;

export { client as aiRouter };
