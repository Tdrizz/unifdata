import OpenAI from "openai";

export const AI_MODELS = {
  manager: "nousresearch/hermes-3-llama-3.1-70b",
  chat: "anthropic/claude-3.5-haiku",
  outreach: "anthropic/claude-3.5-sonnet",
  revenue: "openai/gpt-4o-mini",
  dataQuality: "google/gemini-flash-1.5",
  alertFormatter: "openai/gpt-4o-mini",
} as const;

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY ?? "missing",
      defaultHeaders: { "HTTP-Referer": "https://unifdata.com" },
    });
  }
  return _client;
}

export const aiRouter = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
