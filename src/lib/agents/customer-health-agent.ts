import type { SupabaseClient } from "@supabase/supabase-js";

const DISENGAGEMENT_DAYS = 60;
const MIN_BOOKINGS_BEFORE_CHECK = 2;

type ChurnSignal = {
  customerId: string;
  customerName: string;
  daysSinceLastBooking: number;
  totalBookings: number;
};

export async function computeChurnSignals(
  orgId: string,
  supabase: SupabaseClient,
): Promise<ChurnSignal[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DISENGAGEMENT_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  // Customers with at least MIN_BOOKINGS jobs but no booking in the last DISENGAGEMENT_DAYS days
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .eq("company_id", orgId);

  if (!customers || customers.length === 0) return [];

  const { data: jobs } = await supabase
    .from("jobs")
    .select("customer_id, start_date, created_at")
    .eq("company_id", orgId)
    .not("customer_id", "is", null);

  if (!jobs || jobs.length === 0) return [];

  // Group jobs by customer
  const jobsByCustomer = new Map<string, Array<{ date: string }>>();
  for (const job of jobs) {
    if (!job.customer_id) continue;
    const dateStr = job.start_date ?? job.created_at?.slice(0, 10) ?? null;
    if (!dateStr) continue;
    const list = jobsByCustomer.get(job.customer_id) ?? [];
    list.push({ date: dateStr });
    jobsByCustomer.set(job.customer_id, list);
  }

  const signals: ChurnSignal[] = [];

  for (const customer of customers) {
    const customerJobs = jobsByCustomer.get(customer.id);
    if (!customerJobs || customerJobs.length < MIN_BOOKINGS_BEFORE_CHECK) continue;

    const sorted = customerJobs
      .map((j) => j.date)
      .sort()
      .reverse();

    const lastDate = sorted[0];
    if (lastDate >= cutoffStr) continue; // still active

    const daysSince = Math.round(
      (new Date(today).getTime() - new Date(lastDate).getTime()) / 86_400_000,
    );

    signals.push({
      customerId: customer.id,
      customerName: customer.name ?? "Unknown",
      daysSinceLastBooking: daysSince,
      totalBookings: customerJobs.length,
    });
  }

  return signals.sort((a, b) => b.daysSinceLastBooking - a.daysSinceLastBooking);
}

export async function runChurnSignalAgent(
  orgId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const signals = await computeChurnSignals(orgId, supabase);
  if (signals.length === 0) return;

  // Write event log rows for tracking
  const eventRows = signals.slice(0, 20).map((s) => ({
    organization_id: orgId,
    event_type: "churn_risk_detected",
    entity_type: "customer",
    entity_id: s.customerId,
    payload: {
      days_since_last_booking: s.daysSinceLastBooking,
      total_bookings: s.totalBookings,
    },
  }));

  await supabase.from("agent_events").insert(eventRows);

  // Write a single summary alert visible in the Agent Inbox
  const topCustomers = signals
    .slice(0, 3)
    .map((s) => `${s.customerName} (${s.daysSinceLastBooking}d silent)`)
    .join(", ");

  await supabase.from("agent_alerts").insert({
    organization_id: orgId,
    alert_type: "churn_risk",
    severity: signals.length >= 5 ? "warning" : "info",
    title: `${signals.length} customer${signals.length !== 1 ? "s" : ""} may be disengaging`,
    body: `No booking in ${DISENGAGEMENT_DAYS}+ days: ${topCustomers}${signals.length > 3 ? ` and ${signals.length - 3} more` : ""}.`,
  });
}
