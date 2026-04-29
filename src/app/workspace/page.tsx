import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

function getStartOfMonth() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value: number | string | null) {
  const numberValue = Number(value || 0);

  return `$${numberValue.toLocaleString()}`;
}

function getCustomerName(customerRelation: unknown) {
  if (Array.isArray(customerRelation)) {
    return customerRelation[0]?.name || "No customer";
  }

  if (
    typeof customerRelation === "object" &&
    customerRelation !== null &&
    "name" in customerRelation
  ) {
    return String(
      (customerRelation as { name?: string | null }).name || "No customer",
    );
  }

  return "No customer";
}

function getLeadService(leadRelation: unknown) {
  if (Array.isArray(leadRelation)) {
    return leadRelation[0]?.service_requested || "No lead";
  }

  if (
    typeof leadRelation === "object" &&
    leadRelation !== null &&
    "service_requested" in leadRelation
  ) {
    return String(
      (leadRelation as { service_requested?: string | null })
        .service_requested || "No lead",
    );
  }

  return "No lead";
}

function getServiceRevenue(
  sales: { service_type: string | null; amount: number | string | null }[],
) {
  const serviceMap = new Map<string, number>();

  sales.forEach((sale) => {
    const service = sale.service_type || "Other";
    const current = serviceMap.get(service) || 0;

    serviceMap.set(service, current + Number(sale.amount || 0));
  });

  return Array.from(serviceMap.entries())
    .map(([service, revenue]) => ({
      service,
      revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function getHealthStatus({
  followUpsDue,
  unpaidRevenue,
  openEstimateValue,
}: {
  followUpsDue: number;
  unpaidRevenue: number;
  openEstimateValue: number;
}) {
  if (followUpsDue >= 5 || unpaidRevenue >= 10000) {
    return {
      label: "Needs Attention",
      tone: "warning" as const,
      message:
        "There are several items that need follow-up before they turn into lost revenue.",
    };
  }

  if (openEstimateValue >= 5000) {
    return {
      label: "Strong Pipeline",
      tone: "info" as const,
      message:
        "Your pipeline has meaningful open estimate value. Follow-ups should be prioritized.",
    };
  }

  return {
    label: "Stable",
    tone: "success" as const,
    message:
      "Your workspace is organized and there are no major issues requiring immediate attention.",
  };
}

export default async function WorkspacePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentCompany = await getCurrentCompany();

  if (!currentCompany) {
    redirect("/onboarding");
  }

  const { company } = currentCompany;

  const startOfMonth = getStartOfMonth();
  const today = getTodayString();

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (customersError) {
    throw new Error(customersError.message);
  }

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select(
      `
      id,
      status,
      estimated_value,
      source,
      service_requested,
      next_follow_up_date,
      created_at,
      customers (
        name
      )
    `,
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select(
      `
      id,
      status,
      job_value,
      service_type,
      start_date,
      completed_date,
      paid_status,
      created_at,
      customers (
        name
      )
    `,
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select(
      `
      id,
      amount,
      payment_status,
      sale_date,
      service_type,
      source,
      created_at,
      customers (
        name
      )
    `,
    )
    .eq("company_id", company.id)
    .order("sale_date", { ascending: false });

  if (salesError) {
    throw new Error(salesError.message);
  }

  const { data: followUps, error: followUpsError } = await supabase
    .from("follow_ups")
    .select(
      `
      id,
      due_date,
      status,
      message,
      created_at,
      customers (
        name
      ),
      leads (
        service_requested
      )
    `,
    )
    .eq("company_id", company.id)
    .order("due_date", { ascending: true });

  if (followUpsError) {
    throw new Error(followUpsError.message);
  }

  const totalCustomers = customers?.length || 0;

  const totalRevenue =
    sales?.reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const monthlyRevenue =
    sales
      ?.filter((sale) => sale.sale_date >= startOfMonth)
      .reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const unpaidRevenue =
    sales
      ?.filter((sale) => sale.payment_status !== "Paid")
      .reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const newLeadsThisMonth =
    leads?.filter((lead) => lead.created_at.slice(0, 10) >= startOfMonth)
      .length || 0;

  const openEstimateValue =
    leads
      ?.filter((lead) => lead.status === "Estimate Sent")
      .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0) || 0;

  const activeJobs =
    jobs?.filter(
      (job) => job.status === "Scheduled" || job.status === "In Progress",
    ).length || 0;

  const completedJobs =
    jobs?.filter((job) => job.status === "Completed" || job.status === "Paid")
      .length || 0;

  const followUpsDue =
    followUps?.filter(
      (followUp) => followUp.status === "Open" && followUp.due_date <= today,
    ).length || 0;

  const dueFollowUps =
    followUps
      ?.filter(
        (followUp) => followUp.status === "Open" && followUp.due_date <= today,
      )
      .slice(0, 4) || [];

  const recentLeads = leads?.slice(0, 4) || [];
  const recentSales = sales?.slice(0, 4) || [];
  const serviceRevenue = getServiceRevenue(sales || []).slice(0, 5);

  const highestServiceRevenue = Math.max(
    ...serviceRevenue.map((item) => item.revenue),
    1,
  );

  const health = getHealthStatus({
    followUpsDue,
    unpaidRevenue,
    openEstimateValue,
  });

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""}>
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl md:p-8">
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative grid gap-8 xl:grid-cols-[1.3fr_0.7fr] xl:items-end">
            <div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                Business Command Center
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                {company.name}
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                Live view of revenue, pipeline, jobs, customers, and follow-ups
                across your operation.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    This Month
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {formatCurrency(monthlyRevenue)}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Pipeline
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {formatCurrency(openEstimateValue)}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Active Jobs
                  </p>
                  <p className="mt-2 text-3xl font-black">{activeJobs}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Due Now
                  </p>
                  <p className="mt-2 text-3xl font-black">{followUpsDue}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-300">Business health</p>
                  <p className="mt-1 text-2xl font-black">{health.label}</p>
                </div>

                <StatusBadge tone={health.tone}>{health.label}</StatusBadge>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-300">
                {health.message}
              </p>

              <Link
                href="/ai-assistant"
                className="mt-5 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 hover:bg-slate-200"
              >
                Generate AI report →
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total revenue"
            value={formatCurrency(totalRevenue)}
            helper="All recorded sales"
            tone="green"
          />

          <StatCard
            label="Unpaid / partial"
            value={formatCurrency(unpaidRevenue)}
            helper="Payment follow-up needed"
            tone={unpaidRevenue > 0 ? "amber" : "default"}
          />

          <StatCard
            label="New leads"
            value={newLeadsThisMonth}
            helper="Created this month"
            tone="blue"
          />

          <StatCard
            label="Jobs"
            value={`${activeJobs} / ${completedJobs}`}
            helper="Active / completed"
            tone="default"
          />

          <StatCard
            label="Customers"
            value={totalCustomers}
            helper="Total customer records"
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Revenue Mix
                </p>
                <h2 className="mt-2 text-2xl font-black">Revenue by service</h2>
              </div>

              <Link
                href="/sales"
                className="text-sm font-bold text-slate-600 hover:text-slate-950"
              >
                View sales →
              </Link>
            </div>

            {serviceRevenue.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No sales data yet. Add sales to see service performance.
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                {serviceRevenue.map((item) => {
                  const width = Math.max(
                    8,
                    Math.round((item.revenue / highestServiceRevenue) * 100),
                  );

                  return (
                    <div key={item.service}>
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-bold text-slate-950">
                          {item.service}
                        </p>
                        <p className="font-black">
                          {formatCurrency(item.revenue)}
                        </p>
                      </div>

                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-950"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Attention Queue
                </p>
                <h2 className="mt-2 text-2xl font-black">Due follow-ups</h2>
              </div>

              <Link
                href="/follow-ups"
                className="text-sm font-bold text-slate-600 hover:text-slate-950"
              >
                View all →
              </Link>
            </div>

            {dueFollowUps.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
                <p className="font-bold">Nothing urgent right now.</p>
                <p className="mt-2 text-sm leading-6">
                  No open follow-ups are due today or overdue.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {dueFollowUps.map((followUp) => (
                  <div
                    key={followUp.id}
                    className="rounded-3xl border border-amber-200 bg-amber-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-amber-950">
                          {getCustomerName(followUp.customers)}
                        </p>
                        <p className="mt-1 text-sm text-amber-800">
                          {getLeadService(followUp.leads)}
                        </p>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-800">
                        Due {new Date(followUp.due_date).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-amber-900">
                      {followUp.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Pipeline
                </p>
                <h2 className="mt-2 text-2xl font-black">Recent leads</h2>
              </div>

              <Link
                href="/leads"
                className="text-sm font-bold text-slate-600 hover:text-slate-950"
              >
                Manage →
              </Link>
            </div>

            {recentLeads.length === 0 ? (
              <div className="p-8 text-slate-500">No leads yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-950">
                          {getCustomerName(lead.customers)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {lead.service_requested}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Source: {lead.source || "Unknown"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-black">
                          {formatCurrency(lead.estimated_value)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {lead.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Revenue
                </p>
                <h2 className="mt-2 text-2xl font-black">Recent sales</h2>
              </div>

              <Link
                href="/sales"
                className="text-sm font-bold text-slate-600 hover:text-slate-950"
              >
                Manage →
              </Link>
            </div>

            {recentSales.length === 0 ? (
              <div className="p-8 text-slate-500">No sales yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-950">
                          {getCustomerName(sale.customers)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {sale.service_type || "Other service"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {sale.sale_date}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-black">
                          {formatCurrency(sale.amount)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {sale.payment_status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
