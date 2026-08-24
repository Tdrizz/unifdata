import OpenAI from "openai";

// "openrouter/auto" lets OpenRouter pick the best available model per-request
// instead of pinning to one provider's model id, which breaks outright whenever
// that specific id is renamed, deprecated, or temporarily unavailable upstream.
//
// `chat` is pinned instead: it's the one call site that passes `tools` and
// depends on the model populating the API's structured `tool_calls` field.
// "auto" can route to a model that doesn't reliably support that — observed
// in production as the model writing out a fake `<tool_call>...</tool_call>`
// text block instead of a real tool call, which then got no execution and
// displayed as raw garbage in the chat. gpt-4o has consistent native
// tool-calling support, same reason map-columns/route.ts pins its own model
// instead of using this table.
export const AI_MODELS = {
  manager: "openrouter/auto",
  chat: "openai/gpt-4o",
  outreach: "openrouter/auto",
  revenue: "openrouter/auto",
  dataQuality: "openrouter/auto",
  alertFormatter: "openrouter/auto",
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
