import { langfuse, flushLangfuse } from "./langfuse";
import type { LangfuseTraceClient, LangfuseSpanClient } from "langfuse";

export { flushLangfuse };

export type TraceContext = {
  trace: LangfuseTraceClient;
  orgId: string;
};

export function createNightlyTrace(orgId: string, date: string): TraceContext {
  const trace = langfuse.trace({
    name: "nightly-run",
    userId: orgId,
    metadata: { orgId, date },
    tags: ["nightly", "pipeline"],
  });
  return { trace, orgId };
}

export function createChatTrace(orgId: string, sessionId: string): TraceContext {
  const trace = langfuse.trace({
    name: "chat-message",
    userId: orgId,
    sessionId,
    tags: ["chat"],
  });
  return { trace, orgId };
}

export function startSpan(
  ctx: TraceContext,
  name: string,
  input: Record<string, unknown>,
): LangfuseSpanClient {
  return ctx.trace.span({ name, input, startTime: new Date() });
}

export function endSpan(
  span: LangfuseSpanClient,
  output: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): void {
  span.end({ output, metadata });
}

export function logGeneration(
  ctx: TraceContext | LangfuseSpanClient,
  opts: {
    name: string;
    model: string;
    prompt: string;
    completion: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    zodPassed?: boolean;
    error?: string;
  },
): void {
  const parent = "trace" in ctx ? ctx.trace : ctx;
  parent.generation({
    name: opts.name,
    model: opts.model,
    input: opts.prompt,
    output: opts.completion,
    usage: { input: opts.inputTokens, output: opts.outputTokens },
    metadata: {
      latencyMs: opts.latencyMs,
      zodPassed: opts.zodPassed,
      error: opts.error,
    },
  });
}
