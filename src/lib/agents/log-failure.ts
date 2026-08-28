import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Parses a model's JSON response, tolerating a response that isn't valid JSON
 * at all (a plain SyntaxError) rather than letting it throw uncaught.
 *
 * Returns `undefined` on failure so the caller's Zod schema.safeParse(...)
 * rejects it the same way it would reject any other malformed shape -- one
 * failure path to handle, instead of a separate try/catch per call site.
 */
export function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Records a worker's failure to produce usable output under that worker's
 * own name, so it's attributable later.
 *
 * Before this, a worker whose output failed Zod validation (or wasn't valid
 * JSON) just returned early with nothing written to Postgres -- the failure
 * only showed up, if at all, folded into the coordinator's single combined
 * error string via Promise.allSettled, with no per-worker attribution. The
 * admin health page's "Zod Failures by Agent" breakdown queries
 * `agent_logs` by `agent_name`, found nothing, and read as a permanently
 * green "no failures this period" -- not because there were none, but
 * because nothing was ever written for it to find.
 */
export async function logWorkerFailure(
  supabase: SupabaseClient,
  orgId: string,
  agentName: string,
  error: string,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("agent_logs").insert({
    organization_id: orgId,
    agent_name: agentName,
    events_fired: 0,
    error: error.slice(0, 2000),
  });
}
