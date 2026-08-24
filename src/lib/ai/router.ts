import OpenAI from "openai";

// "openrouter/auto" lets OpenRouter pick the best available model per-request
// instead of pinning to one provider's model id, which breaks outright whenever
// that specific id is renamed, deprecated, or temporarily unavailable upstream.
export const AI_MODELS = {
  manager: "openrouter/auto",
  chat: "openrouter/auto",
  outreach: "openrouter/auto",
  revenue: "openrouter/auto",
  dataQuality: "openrouter/auto",
  alertFormatter: "openrouter/auto",
  operatingBrief: "openrouter/auto",
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
