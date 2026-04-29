import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

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

  const monthlyRevenue =
    sales
      ?.filter((sale) => sale.sale_date >= startOfMonth)
      .reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const totalRevenue =
    sales?.reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

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

  const serviceRevenue = getServiceRevenue(sales || []).slice(0, 5);

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""}>
      <div className="space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Dashboard
            </p>

            <h1 className="mt-2 text-3xl font-bold">{company.name}</h1>

            <p className="mt-2 text-slate-600">
              Live overview of customers, leads, jobs, sales, and follow-ups.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            Logged in as{" "}
            <span className="font-semibold text-slate-950">{user.email}</span>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Monthly revenue</p>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(monthlyRevenue)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Since {new Date(startOfMonth).toLocaleDateString()}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Open estimates</p>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(openEstimateValue)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Leads with Estimate Sent status
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm text-amber-700">Follow-ups due</p>
            <p className="mt-2 text-3xl font-bold text-amber-950">
              {followUpsDue}
            </p>
            <p className="mt-2 text-xs text-amber-700">
              Open reminders due today or earlier
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Customers</p>
            <p className="mt-2 text-3xl font-bold">{totalCustomers}</p>
            <p className="mt-2 text-xs text-slate-500">
              Total customer records
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total revenue</p>
            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(totalRevenue)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Unpaid / partial</p>
            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(unpaidRevenue)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">New leads this month</p>
            <p className="mt-2 text-2xl font-bold">{newLeadsThisMonth}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Jobs</p>
            <p className="mt-2 text-2xl font-bold">
              {activeJobs} active / {completedJobs} done
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-bold">Due follow-ups</h2>
              <p className="mt-1 text-sm text-slate-500">
                These need attention first.
              </p>
            </div>

            {dueFollowUps.length === 0 ? (
              <div className="p-6 text-slate-500">
                No due follow-ups right now.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {dueFollowUps.map((followUp) => (
                  <div key={followUp.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {getCustomerName(followUp.customers)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {getLeadService(followUp.leads)}
                        </p>
                      </div>

                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Due {new Date(followUp.due_date).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-600">
                      {followUp.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-bold">Recent leads</h2>
              <p className="mt-1 text-sm text-slate-500">
                Newest pipeline opportunities.
              </p>
            </div>

            {recentLeads.length === 0 ? (
              <div className="p-6 text-slate-500">No leads yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {getCustomerName(lead.customers)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {lead.service_requested}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Source: {lead.source || "—"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold">
                          {formatCurrency(lead.estimated_value)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {lead.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-bold">Revenue by service</h2>
            <p className="mt-1 text-sm text-slate-500">
              Top service categories from sales records.
            </p>
          </div>

          {serviceRevenue.length === 0 ? (
            <div className="p-6 text-slate-500">No sales data yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {serviceRevenue.map((item) => (
                <div
                  key={item.service}
                  className="flex items-center justify-between p-5"
                >
                  <p className="font-semibold text-slate-950">{item.service}</p>

                  <p className="text-lg font-bold">
                    {formatCurrency(item.revenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
