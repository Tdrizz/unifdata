import type { SupabaseClient } from "@supabase/supabase-js";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { isPro } from "@/lib/feature-gates";
import { flushLangfuse } from "@/lib/observability/tracing";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function runPatternSpotterWorker(
  orgId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, business_sector, tier")
    .eq("id", orgId)
    .single();

  if (!company || !isPro(company as { tier: string })) return;

  // Fetch all completed jobs that have a service type and a linked customer
  const { data: jobs } = await supabase
    .from("jobs")
    .select("customer_id, service_type, completed_date")
    .eq("company_id", orgId)
    .eq("status", "completed")
    .not("service_type", "is", null)
    .not("customer_id", "is", null)
    .order("customer_id")
    .order("completed_date");

  if (!jobs || jobs.length < 5) return;

  // Build ordered service list per customer (unique services in first-seen order)
  const customerServices = new Map<string, string[]>();
  for (const job of jobs) {
    const cid = job.customer_id as string;
    const svc = (job.service_type as string).trim().toLowerCase();
    if (!customerServices.has(cid)) customerServices.set(cid, []);
    const list = customerServices.get(cid)!;
    if (!list.includes(svc)) list.push(svc);
  }

  // Need enough distinct customers for patterns to be meaningful
  if (customerServices.size < 5) return;

  // Count A→B transitions (one count per customer that had A then B in order)
  const transitions = new Map<string, Map<string, number>>();
  for (const services of customerServices.values()) {
    for (let i = 0; i < services.length - 1; i++) {
      const a = services[i];
      const b = services[i + 1];
      if (!transitions.has(a)) transitions.set(a, new Map());
      const inner = transitions.get(a)!;
      inner.set(b, (inner.get(b) ?? 0) + 1);
    }
  }

  // Find patterns that appear in at least 3 customers
  const MIN_PATTERN_COUNT = 3;
  const patterns: { a: string; b: string; count: number; candidateCount: number }[] = [];

  for (const [a, bMap] of transitions) {
    for (const [b, count] of bMap) {
      if (count < MIN_PATTERN_COUNT) continue;
      // Candidates: customers who had A but haven't had B yet
      const candidateCount = [...customerServices.values()].filter(
        (svcs) => svcs.includes(a) && !svcs.includes(b),
      ).length;
      if (candidateCount > 0) {
        patterns.push({ a, b, count, candidateCount });
      }
    }
  }

  if (patterns.length === 0) return;

  // Pick the pattern with the most follow-on candidates (tie-break: frequency)
  patterns.sort((x, y) =>
    y.candidateCount !== x.candidateCount
      ? y.candidateCount - x.candidateCount
      : y.count - x.count,
  );
  const top = patterns[0];

  const profile = getIndustryProfile(company.business_sector);
  const custPlural = profile.labels.customerPlural;
  const custSingular = profile.labels.customerSingular;
  const jobPlural = profile.labels.jobPlural.toLowerCase();
  const subjectLabel = top.candidateCount === 1 ? custSingular : custPlural;

  await supabase.from("agent_alerts").insert({
    organization_id: orgId,
    alert_type: "service_cooccurrence",
    severity: top.candidateCount >= 5 ? "warning" : "info",
    title: `${top.candidateCount} ${subjectLabel} may need ${capitalize(top.b)}`,
    body: `${top.candidateCount} ${subjectLabel.toLowerCase()} received "${capitalize(top.a)}" but haven't had "${capitalize(top.b)}" — a follow-on sequence seen ${top.count}× in your ${jobPlural} history.`,
    reasoning: `Co-occurrence pattern: "${top.a}" → "${top.b}" (${top.count} occurrences, ${top.candidateCount} eligible ${custPlural.toLowerCase()}).`,
    escalation_level: 0,
  });

  await supabase.from("agent_logs").insert({
    organization_id: orgId,
    agent_name: "pattern-spotter",
    events_fired: 1,
  });

  await flushLangfuse();
}
