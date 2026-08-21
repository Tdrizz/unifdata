import * as Sentry from "@sentry/nextjs";
import type { JobsOptions } from "bullmq";
import { getAutomationQueue, isRedisConfigured } from "./client";

/**
 * Enqueue an automation job with loud, non-throwing failure semantics.
 *
 * Returns true if the job was enqueued, false if it could not be — either
 * because REDIS_URL is not configured or because the enqueue itself threw
 * (Redis unreachable). It never throws, so the caller stays in control of the
 * HTTP response instead of surfacing an unhandled 500.
 *
 * Every failure is reported to Sentry with context. Previously a missing or
 * broken Redis made the webhook routes throw a 500 that vanished into logs
 * while the triggering event (overdue invoice, lost quote, new contact,
 * completed job) was silently dropped. Now a dropped automation is always
 * visible to ops.
 */
export async function enqueueAutomationJob(
  name: string,
  data: unknown,
  opts: JobsOptions,
  ctx: { org?: string; detail?: Record<string, unknown> } = {},
): Promise<boolean> {
  if (!isRedisConfigured()) {
    Sentry.captureMessage(
      `Automation dropped — REDIS_URL not configured (job=${name})`,
      { level: "error", extra: { job: name, org: ctx.org, ...ctx.detail } },
    );
    return false;
  }

  try {
    await getAutomationQueue().add(name, data, opts);
    return true;
  } catch (err) {
    Sentry.captureException(err, {
      extra: { job: name, phase: "enqueue", org: ctx.org, ...ctx.detail },
    });
    return false;
  }
}
