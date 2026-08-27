import { createAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = ReturnType<typeof createAdminClient> & { from(table: string): any };

export type AgentMemoryRow = {
  id: string;
  organization_id: string;
  signal_type: string;
  customer_id: string | null;
  last_fired_at: string;
  fire_count: number;
  last_outcome: "approved" | "rejected" | null;
};

function db(): AnySupabase {
  return createAdminClient() as AnySupabase;
}

export async function getMemory(
  orgId: string,
  signalType: string,
  customerId?: string | null,
): Promise<AgentMemoryRow | null> {
  const supabase = db();

  if (customerId) {
    const { data } = await supabase
      .from("agent_memory")
      .select("*")
      .eq("organization_id", orgId)
      .eq("signal_type", signalType)
      .eq("customer_id", customerId)
      .maybeSingle();
    return (data as AgentMemoryRow | null) ?? null;
  }

  const { data } = await supabase
    .from("agent_memory")
    .select("*")
    .eq("organization_id", orgId)
    .eq("signal_type", signalType)
    .is("customer_id", null)
    .maybeSingle();
  return (data as AgentMemoryRow | null) ?? null;
}

export async function recordSignalFired(
  orgId: string,
  signalType: string,
  customerId?: string | null,
): Promise<void> {
  const supabase = db();
  const existing = await getMemory(orgId, signalType, customerId);

  if (existing) {
    await supabase
      .from("agent_memory")
      .update({
        fire_count: existing.fire_count + 1,
        last_fired_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("agent_memory").insert({
      organization_id: orgId,
      signal_type: signalType,
      customer_id: customerId ?? null,
    });
  }
}

export async function recordDraftOutcome(
  orgId: string,
  signalType: string,
  customerId: string | null,
  outcome: "approved" | "rejected",
): Promise<void> {
  const supabase = db();

  if (customerId) {
    await supabase
      .from("agent_memory")
      .update({ last_outcome: outcome, updated_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .eq("signal_type", signalType)
      .eq("customer_id", customerId);
  } else {
    await supabase
      .from("agent_memory")
      .update({ last_outcome: outcome, updated_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .eq("signal_type", signalType)
      .is("customer_id", null);
  }
}

export async function getEscalationLevel(
  orgId: string,
  signalType: string,
  customerId?: string | null,
): Promise<0 | 1 | 2> {
  const mem = await getMemory(orgId, signalType, customerId);
  if (!mem) return 0;
  if (mem.fire_count >= 2) return 2;
  return 1;
}

export function hoursSince(isoTimestamp: string): number {
  return (Date.now() - new Date(isoTimestamp).getTime()) / 3_600_000;
}

// Every agent worker that inserts into agent_alerts used to do so with no
// existence check -- a dismissed alert just got replaced by an identical one
// on the next run (or after whatever time-based cooldown that worker had
// elapsed). This checks for ANY alert of the same type+record within the
// lookback window regardless of status, so a dismissed alert stays dismissed
// instead of reappearing.
export async function hasRecentAlert(
  orgId: string,
  alertType: string,
  recordId: string | null,
  lookbackDays = 7,
): Promise<boolean> {
  const supabase = db();
  const cutoff = new Date(Date.now() - lookbackDays * 86_400_000).toISOString();

  let query = supabase
    .from("agent_alerts")
    .select("id")
    .eq("organization_id", orgId)
    .eq("alert_type", alertType)
    .gte("created_at", cutoff)
    .limit(1);

  query = recordId ? query.eq("record_id", recordId) : query.is("record_id", null);

  const { data } = await query.maybeSingle();
  return !!data;
}
