import { createAdminClient } from "@/lib/supabase/admin";

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export type DraftApprovalRow = {
  draft_type: string;
  total: number;
  approved: number;
  rejected: number;
  approvalRate: number;
};

export async function getDraftApprovalRates(days = 7): Promise<DraftApprovalRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agent_drafts")
    .select("draft_type, status")
    .gte("created_at", daysAgo(days));

  if (!data) return [];

  const byType = new Map<string, { total: number; approved: number; rejected: number }>();
  for (const row of data) {
    const key = row.draft_type ?? "unknown";
    if (!byType.has(key)) byType.set(key, { total: 0, approved: 0, rejected: 0 });
    const entry = byType.get(key)!;
    entry.total++;
    if (row.status === "approved") entry.approved++;
    if (row.status === "rejected") entry.rejected++;
  }

  return Array.from(byType.entries()).map(([draft_type, counts]) => ({
    draft_type,
    ...counts,
    approvalRate: counts.total > 0 ? Math.round((counts.approved / counts.total) * 100) : 0,
  }));
}

export type ZodFailureRow = { agent_name: string; total: number; failures: number; failureRate: number };

export async function getZodFailureRates(days = 7): Promise<ZodFailureRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agent_logs")
    .select("agent_name, error")
    .gte("run_at", daysAgo(days));

  if (!data) return [];

  const byAgent = new Map<string, { total: number; failures: number }>();
  for (const row of data) {
    const key = row.agent_name ?? "unknown";
    if (!byAgent.has(key)) byAgent.set(key, { total: 0, failures: 0 });
    const entry = byAgent.get(key)!;
    entry.total++;
    if (row.error) entry.failures++;
  }

  return Array.from(byAgent.entries())
    .map(([agent_name, counts]) => ({
      agent_name,
      ...counts,
      failureRate: counts.total > 0 ? Math.round((counts.failures / counts.total) * 100) : 0,
    }))
    .sort((a, b) => b.failures - a.failures);
}

export type NightlyRunStats = { total: number; success: number; failed: number; successRate: number };

export async function getNightlyRunSuccessRate(days = 14): Promise<NightlyRunStats> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agent_logs")
    .select("error")
    .eq("agent_name", "nightly-coordinator")
    .gte("run_at", daysAgo(days));

  if (!data) return { total: 0, success: 0, failed: 0, successRate: 100 };

  const total = data.length;
  const success = data.filter((r) => !r.error).length;
  const failed = total - success;
  return { total, success, failed, successRate: total > 0 ? Math.round((success / total) * 100) : 100 };
}

export type ToolCallRow = { tool: string; total: number; succeeded: number; failed: number; successRate: number };

export async function getToolCallSuccessRates(days = 7): Promise<ToolCallRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agent_logs")
    .select("agent_name, error")
    .like("agent_name", "tool_%")
    .gte("run_at", daysAgo(days));

  if (!data) return [];

  const byTool = new Map<string, { total: number; succeeded: number; failed: number }>();
  for (const row of data) {
    const key = row.agent_name;
    if (!byTool.has(key)) byTool.set(key, { total: 0, succeeded: 0, failed: 0 });
    const entry = byTool.get(key)!;
    entry.total++;
    if (row.error) entry.failed++;
    else entry.succeeded++;
  }

  return Array.from(byTool.entries()).map(([tool, counts]) => ({
    tool,
    ...counts,
    successRate: counts.total > 0 ? Math.round((counts.succeeded / counts.total) * 100) : 100,
  }));
}

export type RoiRow = { organization_id: string; total: number };

export async function getRoiByOrg(days = 30): Promise<RoiRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("roi_events")
    .select("organization_id, amount_recovered")
    .gte("created_at", daysAgo(days));

  if (!data) return [];

  const byOrg = new Map<string, number>();
  for (const row of data) {
    const orgId = row.organization_id ?? "unknown";
    byOrg.set(orgId, (byOrg.get(orgId) ?? 0) + Number(row.amount_recovered || 0));
  }

  return Array.from(byOrg.entries())
    .map(([organization_id, total]) => ({ organization_id, total }))
    .sort((a, b) => b.total - a.total);
}

export type RetrievalStats = { semanticCount: number; fallbackCount: number; fallbackRate: number };

export async function getRetrievalFallbackRate(days = 7): Promise<RetrievalStats> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agent_logs")
    .select("error")
    .eq("agent_name", "chat-retrieval")
    .gte("run_at", daysAgo(days));

  if (!data || data.length === 0) return { semanticCount: 0, fallbackCount: 0, fallbackRate: 0 };

  const fallbackCount = data.filter((r) => r.error).length;
  const semanticCount = data.length - fallbackCount;
  return {
    semanticCount,
    fallbackCount,
    fallbackRate: Math.round((fallbackCount / data.length) * 100),
  };
}

export type AvgInboxStats = { avgItemsPerOrg: number; totalOrgs: number; totalItems: number };

export async function getAvgInboxItemsPerOrg(days = 7): Promise<AvgInboxStats> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agent_drafts")
    .select("organization_id")
    .gte("created_at", daysAgo(days));

  if (!data || data.length === 0) return { avgItemsPerOrg: 0, totalOrgs: 0, totalItems: 0 };

  const byOrg = new Map<string, number>();
  for (const row of data) {
    const orgId = row.organization_id ?? "unknown";
    byOrg.set(orgId, (byOrg.get(orgId) ?? 0) + 1);
  }

  const totalOrgs = byOrg.size;
  const totalItems = data.length;
  const avgItemsPerOrg = totalOrgs > 0 ? Math.round((totalItems / totalOrgs) * 10) / 10 : 0;
  return { avgItemsPerOrg, totalOrgs, totalItems };
}
