import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

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
      .slice(0, 5) || [];

  const recentLeads = leads?.slice(0, 5) || [];
  const recentSales = sales?.slice(0, 5) || [];
  const serviceRevenue = getServiceRevenue(sales || []).slice(0, 5);

  const highestServiceRevenue = Math.max(
    ...serviceRevenue.map((item) => item.revenue),
    1,
  );

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""}>
      <div className="space-y-7">
        <PageHeader
          eyebrow="Command Center"
          title={company.name}
          description="A live operating view of customers, leads, jobs, sales, follow-ups, and revenue."
          actions={
            <Link
              href="/ai-assistant"
              className="inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800"
            >
              Generate AI summary
            </Link>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Monthly revenue"
            value={formatCurrency(monthlyRevenue)}
            helper="Recorded this month"
            tone="green"
          />

          <StatCard
            label="Open estimates"
            value={formatCurrency(openEstimateValue)}
            helper="Pipeline value waiting on follow-up"
            tone="blue"
          />

          <StatCard
            label="Follow-ups due"
            value={followUpsDue}
            helper="Open reminders due today or earlier"
            tone={followUpsDue > 0 ? "amber" : "default"}
          />

          <StatCard
            label="Customers"
            value={totalCustomers}
            helper="Total customer records"
          />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            label="Total revenue"
            value={formatCurrency(totalRevenue)}
            helper="All sales records"
          />

          <StatCard
            label="Unpaid / partial"
            value={formatCurrency(unpaidRevenue)}
            helper="Payment attention needed"
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
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard
            title="Revenue by service"
            description="Top service categories from sales records."
            actions={
              <Link
                href="/sales"
                className="text-sm font-black text-slate-600 hover:text-slate-950"
              >
                View sales →
              </Link>
            }
          >
            {serviceRevenue.length === 0 ? (
              <EmptyState
                title="No sales data yet"
                description="Add sales records to see which services are driving revenue."
              />
            ) : (
              <div className="space-y-5 p-5">
                {serviceRevenue.map((item) => {
                  const width = Math.max(
                    8,
                    Math.round((item.revenue / highestServiceRevenue) * 100),
                  );

                  return (
                    <div key={item.service}>
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-black text-slate-950">
                          {item.service}
                        </p>
                        <p className="font-black text-slate-950">
                          {formatCurrency(item.revenue)}
                        </p>
                      </div>

                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
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
          </SectionCard>

          <SectionCard
            title="Attention queue"
            description="Open follow-ups due today or overdue."
            actions={
              <Link
                href="/follow-ups"
                className="text-sm font-black text-slate-600 hover:text-slate-950"
              >
                View all →
              </Link>
            }
          >
            {dueFollowUps.length === 0 ? (
              <div className="p-5">
                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-950">
                  <p className="font-black">Nothing urgent right now.</p>
                  <p className="mt-2 text-sm leading-6">
                    No open follow-ups are due today or overdue.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {dueFollowUps.map((followUp) => (
                  <div key={followUp.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">
                          {getCustomerName(followUp.customers)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {getLeadService(followUp.leads)}
                        </p>
                      </div>

                      <StatusBadge tone="warning">
                        {new Date(followUp.due_date).toLocaleDateString()}
                      </StatusBadge>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {followUp.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <SectionCard
            title="Recent leads"
            description="Newest pipeline opportunities."
            actions={
              <Link
                href="/leads"
                className="text-sm font-black text-slate-600 hover:text-slate-950"
              >
                Manage →
              </Link>
            }
          >
            {recentLeads.length === 0 ? (
              <EmptyState
                title="No leads yet"
                description="Add leads to start tracking pipeline value and follow-ups."
              />
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
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Source: {lead.source || "Unknown"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-black text-slate-950">
                          {formatCurrency(lead.estimated_value)}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {lead.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Recent sales"
            description="Latest revenue records."
            actions={
              <Link
                href="/sales"
                className="text-sm font-black text-slate-600 hover:text-slate-950"
              >
                Manage →
              </Link>
            }
          >
            {recentSales.length === 0 ? (
              <EmptyState
                title="No sales yet"
                description="Add sales records to power revenue reporting."
              />
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
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {sale.sale_date}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-black text-slate-950">
                          {formatCurrency(sale.amount)}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {sale.payment_status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>
      </div>
    </AppShell>
  );
}
