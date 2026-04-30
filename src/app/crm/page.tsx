import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getStaleDateString(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  return date.toISOString();
}

function formatCurrency(value: number | string | null) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString();
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
    return leadRelation[0]?.service_requested || "No related opportunity";
  }

  if (
    typeof leadRelation === "object" &&
    leadRelation !== null &&
    "service_requested" in leadRelation
  ) {
    return String(
      (leadRelation as { service_requested?: string | null })
        .service_requested || "No related opportunity",
    );
  }

  return "No related opportunity";
}

function getStatusTone(status: string | null) {
  if (status === "Won") {
    return "success" as const;
  }

  if (status === "Lost") {
    return "danger" as const;
  }

  if (status === "Needs Follow-Up" || status === "Estimate Sent") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function isOpenStatus(status: string | null) {
  return status !== "Won" && status !== "Lost";
}

function getSourceSummary(
  leads: {
    source: string | null;
    status: string | null;
    estimated_value: number | string | null;
  }[],
) {
  const sourceMap = new Map<
    string,
    {
      count: number;
      value: number;
      won: number;
    }
  >();

  leads.forEach((lead) => {
    const source = lead.source || "Unknown";
    const current = sourceMap.get(source) || {
      count: 0,
      value: 0,
      won: 0,
    };

    sourceMap.set(source, {
      count: current.count + 1,
      value: current.value + Number(lead.estimated_value || 0),
      won: current.won + (lead.status === "Won" ? 1 : 0),
    });
  });

  return Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      ...data,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

export default async function CrmDashboardPage() {
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
  const profile = getIndustryProfile(company.business_sector);

  const today = getTodayString();
  const staleCutoff = getStaleDateString(14);

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name, phone, email, created_at")
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
      customer_id,
      status,
      estimated_value,
      source,
      service_requested,
      next_follow_up_date,
      notes,
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

  const { data: followUps, error: followUpsError } = await supabase
    .from("follow_ups")
    .select(
      `
      id,
      customer_id,
      lead_id,
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
  const totalOpportunities = leads?.length || 0;

  const openOpportunities =
    leads?.filter((lead) => isOpenStatus(lead.status)).length || 0;

  const wonOpportunities =
    leads?.filter((lead) => lead.status === "Won").length || 0;

  const lostOpportunities =
    leads?.filter((lead) => lead.status === "Lost").length || 0;

  const openPipelineValue =
    leads
      ?.filter((lead) => isOpenStatus(lead.status))
      .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0) || 0;

  const estimateSentValue =
    leads
      ?.filter((lead) => lead.status === "Estimate Sent")
      .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0) || 0;

  const dueFollowUps =
    followUps?.filter(
      (followUp) => followUp.status === "Open" && followUp.due_date <= today,
    ) || [];

  const staleOpportunities =
    leads?.filter(
      (lead) =>
        isOpenStatus(lead.status) &&
        (lead.created_at < staleCutoff ||
          Boolean(
            lead.next_follow_up_date && lead.next_follow_up_date <= today,
          )),
    ) || [];

  const customersMissingContact =
    customers?.filter((customer) => !customer.phone && !customer.email)
      .length || 0;

  const conversionRate =
    totalOpportunities > 0
      ? Math.round((wonOpportunities / totalOpportunities) * 100)
      : 0;

  const statusOrder = [
    "New",
    "Contacted",
    "Estimate Sent",
    "Needs Follow-Up",
    "Won",
    "Lost",
  ];

  const pipelineColumns = statusOrder.map((status) => ({
    status,
    items: leads?.filter((lead) => lead.status === status).slice(0, 4) || [],
    count: leads?.filter((lead) => lead.status === status).length || 0,
    value:
      leads
        ?.filter((lead) => lead.status === status)
        .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0) || 0,
  }));

  const sourceSummary = getSourceSummary(leads || []);

  const highValueOpenOpportunities =
    leads
      ?.filter((lead) => isOpenStatus(lead.status))
      .sort(
        (a, b) =>
          Number(b.estimated_value || 0) - Number(a.estimated_value || 0),
      )
      .slice(0, 6) || [];

  const relationshipAlerts = [
    {
      label: "Follow-ups due",
      value: dueFollowUps.length,
      href: "/follow-ups",
      description:
        dueFollowUps.length > 0
          ? "Open reminders are due today or overdue."
          : "No due follow-ups right now.",
    },
    {
      label: "Stale opportunities",
      value: staleOpportunities.length,
      href: "/leads",
      description:
        staleOpportunities.length > 0
          ? "Open records are old or have follow-up dates due."
          : "No stale open opportunities found.",
    },
    {
      label: "Missing customer contact",
      value: customersMissingContact,
      href: "/customers",
      description:
        customersMissingContact > 0
          ? "Some customers are missing both phone and email."
          : "Customer contact records look clean.",
    },
  ];

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Relationships"
          title={`${profile.labels.customerPlural}, ${profile.labels.leadPlural.toLowerCase()}, and follow-ups`}
          description="A relationship-focused view of pipeline activity, follow-up risk, and the records most likely to turn into revenue."
          actions={
            <Link
              href="/leads"
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Manage {profile.labels.leadPlural.toLowerCase()}
            </Link>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={`Open ${profile.labels.leadPlural.toLowerCase()}`}
            value={openOpportunities}
            helper={`${totalOpportunities} total records`}
          />

          <StatCard
            label="Open pipeline value"
            value={formatCurrency(openPipelineValue)}
            helper="Estimated value on open records"
          />

          <StatCard
            label="Follow-ups due"
            value={dueFollowUps.length}
            helper="Open reminders due today or overdue"
            tone={dueFollowUps.length > 0 ? "warning" : "default"}
          />

          <StatCard
            label="Conversion"
            value={`${conversionRate}%`}
            helper={`${wonOpportunities} won / ${lostOpportunities} lost`}
            tone={conversionRate > 0 ? "positive" : "default"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard
            title="Relationship alerts"
            description="The items most likely to affect lost opportunities or messy CRM data."
          >
            <div className="divide-y divide-slate-100">
              {relationshipAlerts.map((alert) => (
                <Link
                  key={alert.label}
                  href={alert.href}
                  className="flex items-start justify-between gap-4 p-5 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {alert.label}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {alert.description}
                    </p>
                  </div>

                  <StatusBadge tone={alert.value > 0 ? "warning" : "success"}>
                    {alert.value}
                  </StatusBadge>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Relationship summary"
            description="High-level relationship and pipeline context."
          >
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">
                  {profile.labels.customerPlural}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {totalCustomers}
                </p>
                <p className="mt-1 text-xs text-slate-500">Stored records</p>
              </div>

              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">
                  Estimate sent value
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {formatCurrency(estimateSentValue)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Needs attention</p>
              </div>

              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">
                  Won records
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {wonOpportunities}
                </p>
                <p className="mt-1 text-xs text-slate-500">Closed as won</p>
              </div>

              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">
                  Stale open records
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {staleOpportunities.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">Review needed</p>
              </div>
            </div>
          </SectionCard>
        </section>

        <SectionCard
          title="Pipeline board"
          description={`${profile.labels.leadPlural} grouped by current status. This shows where relationships are sitting and where follow-up may be needed.`}
        >
          {totalOpportunities === 0 ? (
            <EmptyState
              title={`No ${profile.labels.leadPlural.toLowerCase()} yet`}
              description={`Add ${profile.labels.leadPlural.toLowerCase()} to start tracking pipeline movement.`}
            />
          ) : (
            <div className="grid grid-cols-1 divide-y divide-slate-100 xl:grid-cols-6 xl:divide-x xl:divide-y-0">
              {pipelineColumns.map((column) => (
                <div key={column.status} className="min-w-0">
                  <div className="border-b border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {column.status}
                      </p>

                      <StatusBadge tone={getStatusTone(column.status)}>
                        {column.count}
                      </StatusBadge>
                    </div>

                    <p className="mt-2 text-xs font-medium text-slate-500">
                      {formatCurrency(column.value)}
                    </p>
                  </div>

                  {column.items.length === 0 ? (
                    <div className="p-4 text-sm text-slate-400">No records</div>
                  ) : (
                    <div className="space-y-3 p-3">
                      {column.items.map((lead) => (
                        <Link
                          href="/leads"
                          key={lead.id}
                          className="block rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:bg-white hover:shadow-sm"
                        >
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {lead.service_requested || "Untitled opportunity"}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {getCustomerName(lead.customers)}
                          </p>

                          <p className="mt-2 text-xs font-semibold text-slate-700">
                            {formatCurrency(lead.estimated_value)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard
            title="Source performance"
            description="Where relationship activity and estimated value are coming from."
          >
            {sourceSummary.length === 0 ? (
              <EmptyState
                title="No source data yet"
                description={`Add sources to ${profile.labels.leadPlural.toLowerCase()} to understand what is creating demand.`}
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {sourceSummary.map((source) => (
                  <div
                    key={source.source}
                    className="grid gap-3 p-5 md:grid-cols-[1fr_120px_150px]"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {source.source}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {source.count}{" "}
                        {source.count === 1
                          ? profile.labels.leadSingular.toLowerCase()
                          : profile.labels.leadPlural.toLowerCase()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">Won</p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {source.won}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-xs font-medium text-slate-500">
                        Est. value
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {formatCurrency(source.value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Highest value open records"
            description={`Open ${profile.labels.leadPlural.toLowerCase()} sorted by estimated value.`}
          >
            {highValueOpenOpportunities.length === 0 ? (
              <EmptyState
                title="No open value yet"
                description={`Add estimated value to open ${profile.labels.leadPlural.toLowerCase()} to prioritize follow-up.`}
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {highValueOpenOpportunities.map((lead) => (
                  <Link
                    key={lead.id}
                    href="/leads"
                    className="grid gap-3 p-5 hover:bg-slate-50 md:grid-cols-[1fr_140px_140px]"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {lead.service_requested || "Untitled opportunity"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {getCustomerName(lead.customers)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Status
                      </p>
                      <div className="mt-1">
                        <StatusBadge tone={getStatusTone(lead.status)}>
                          {lead.status || "Unknown"}
                        </StatusBadge>
                      </div>
                    </div>

                    <div className="md:text-right">
                      <p className="text-xs font-medium text-slate-500">
                        Value
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {formatCurrency(lead.estimated_value)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <SectionCard
          title="Due follow-ups"
          description="Open reminders that should be handled before relationships go cold."
          actions={
            <Link
              href="/follow-ups"
              className="text-sm font-semibold text-slate-600 hover:text-slate-950"
            >
              Open action queue →
            </Link>
          }
        >
          {dueFollowUps.length === 0 ? (
            <EmptyState
              title="No due follow-ups"
              description="No open reminders are due today or overdue."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {dueFollowUps.slice(0, 8).map((followUp) => (
                <Link
                  key={followUp.id}
                  href="/follow-ups"
                  className="grid gap-3 p-5 hover:bg-slate-50 md:grid-cols-[1fr_180px_140px]"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {getCustomerName(followUp.customers)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {followUp.message}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Related
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {getLeadService(followUp.leads)}
                    </p>
                  </div>

                  <div className="md:text-right">
                    <p className="text-xs font-medium text-slate-500">Due</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {formatDate(followUp.due_date)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
