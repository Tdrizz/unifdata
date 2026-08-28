import OpenAI from "openai";

// Every one of these tasks except `chat` passes response_format:
// {type: "json_object"} and parses the result as JSON. "openrouter/auto" was
// used everywhere on the theory that it avoids breaking when one provider's
// model id is renamed or deprecated -- but the *same* failure mode already
// documented for `chat` below (routing to a model that silently doesn't
// support a capability the call depends on) applies just as much to JSON
// mode: a model "auto" picks that doesn't honor response_format returns
// prose instead of JSON, which then fails the unguarded JSON.parse in most
// of these workers. Nightly quality was non-deterministic for this reason --
// literally a different, unaudited model writing each business's alerts on
// different nights. Every task here is now pinned to a model confirmed to
// support JSON mode reliably via OpenRouter, at a cost point appropriate for
// a call made once per company per night rather than a single interactive
// chat response.
export const AI_MODELS = {
  manager: "openai/gpt-4o-mini",
  chat: "openai/gpt-4o",
  outreach: "openai/gpt-4o-mini",
  revenue: "openai/gpt-4o-mini",
  dataQuality: "openai/gpt-4o-mini",
  alertFormatter: "openai/gpt-4o-mini",
} as const;
// `chat` is pinned separately: it's the one call site that passes `tools`
// and depends on the model populating the API's structured `tool_calls`
// field. "auto" can route to a model that doesn't reliably support that —
// observed in production as the model writing out a fake
// `<tool_call>...</tool_call>` text block instead of a real tool call,
// which then got no execution and displayed as raw garbage in the chat.
// gpt-4o has consistent native tool-calling support, same reason
// map-columns/route.ts pins its own model instead of using this table.

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY ?? "missing",
      defaultHeaders: { "HTTP-Referer": "https://unifdata.com" },
      // Neither was set before, on any call site. A hung request had no
      // timeout at all -- it blocked until the route's own maxDuration cut
      // it off, taking the rest of that night's queue down with it. The
      // SDK's default retry (2, network errors and 429/5xx only, with
      // backoff) costs nothing extra on the happy path and turns a
      // transient blip into a normal completed call instead of a dropped
      // signal with no record anywhere.
      timeout: 30_000,
      maxRetries: 2,
    });
  }
  return _client;
}

export const aiRouter = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
