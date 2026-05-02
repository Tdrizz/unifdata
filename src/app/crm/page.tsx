import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { formatDateOnly } from "@/lib/date-format";

type LeadRecord = {
  id: string;
  company_id: string;
  customer_id: string | null;
  service_requested: string | null;
  status: string | null;
  estimated_value: number | null;
  source: string | null;
  next_follow_up_date: string | null;
  notes: string | null;
  created_at: string;
};

type CustomerRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function isTodayOrPast(date: string | null) {
  if (!date) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return target <= today;
}

function getStatusTone(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("won") || normalized.includes("accepted")) {
    return "success" as const;
  }

  if (
    normalized.includes("lost") ||
    normalized.includes("cancel") ||
    normalized.includes("declined")
  ) {
    return "danger" as const;
  }

  if (
    normalized.includes("new") ||
    normalized.includes("open") ||
    normalized.includes("contact") ||
    normalized.includes("estimate") ||
    normalized.includes("follow")
  ) {
    return "warning" as const;
  }

  return "neutral" as const;
}

function isWon(status: string | null) {
  const normalized = String(status || "").toLowerCase();
  return normalized.includes("won") || normalized.includes("accepted");
}

function isLost(status: string | null) {
  const normalized = String(status || "").toLowerCase();
  return (
    normalized.includes("lost") ||
    normalized.includes("cancel") ||
    normalized.includes("declined")
  );
}

function getFollowUpText(date: string | null) {
  if (!date) {
    return "No follow-up set";
  }

  if (isTodayOrPast(date)) {
    return `Due ${formatDateOnly(date)}`;
  }

  return `Follow up ${formatDateOnly(date)}`;
}

function getFollowUpTone(date: string | null) {
  if (!date) {
    return "warning" as const;
  }

  if (isTodayOrPast(date)) {
    return "danger" as const;
  }

  return "neutral" as const;
}

function getOpportunityIssues(lead: LeadRecord) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
  }[] = [];

  if (!lead.customer_id) {
    issues.push({
      label: "No person linked",
      tone: "warning",
    });
  }

  if (!lead.source) {
    issues.push({
      label: "No source",
      tone: "neutral",
    });
  }

  if (lead.estimated_value === null || lead.estimated_value === undefined) {
    issues.push({
      label: "No estimate",
      tone: "neutral",
    });
  }

  if (!lead.next_follow_up_date) {
    issues.push({
      label: "No follow-up",
      tone: "warning",
    });
  } else if (isTodayOrPast(lead.next_follow_up_date)) {
    issues.push({
      label: "Follow-up due",
      tone: "danger",
    });
  }

  if (issues.length === 0) {
    issues.push({
      label: "Looks clean",
      tone: "success",
    });
  }

  return issues;
}

export default async function CrmPage() {
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

  const [leadsResult, customersResult] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, company_id, customer_id, service_requested, status, estimated_value, source, next_follow_up_date, notes, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(200),

    supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (leadsResult.error) {
    throw new Error(leadsResult.error.message);
  }

  if (customersResult.error) {
    throw new Error(customersResult.error.message);
  }

  const leads = (leadsResult.data || []) as LeadRecord[];
  const customers = (customersResult.data || []) as CustomerRecord[];

  const customerById = new Map(
    customers.map((customer) => [customer.id, customer]),
  );

  const openLeads = leads.filter(
    (lead) => !isWon(lead.status) && !isLost(lead.status),
  );
  const wonLeads = leads.filter((lead) => isWon(lead.status));
  const lostLeads = leads.filter((lead) => isLost(lead.status));

  const openPipelineValue = openLeads.reduce(
    (sum, lead) => sum + Number(lead.estimated_value || 0),
    0,
  );

  const wonPipelineValue = wonLeads.reduce(
    (sum, lead) => sum + Number(lead.estimated_value || 0),
    0,
  );

  const followUpNeeded = openLeads.filter(
    (lead) =>
      !lead.next_follow_up_date || isTodayOrPast(lead.next_follow_up_date),
  );

  const missingSource = openLeads.filter((lead) => !lead.source);
  const missingEstimate = openLeads.filter(
    (lead) =>
      lead.estimated_value === null || lead.estimated_value === undefined,
  );
  const missingCustomer = openLeads.filter((lead) => !lead.customer_id);

  const cleanupGroups = [
    {
      id: "missing-source",
      label: "Add source",
      title: "Opportunities need sources",
      detail: "Source tracking helps show what marketing is working.",
      count: missingSource.length,
      href: "/leads",
    },
    {
      id: "missing-estimate",
      label: "Add estimate",
      title: "Opportunities need estimated values",
      detail:
        "Estimated value helps prioritize the most important opportunities.",
      count: missingEstimate.length,
      href: "/leads",
    },
    {
      id: "missing-customer",
      label: "Link opportunity",
      title: "Opportunities need a person or business",
      detail: "Pipeline records should usually be connected to someone.",
      count: missingCustomer.length,
      href: "/leads",
    },
  ].filter((item) => item.count > 0);

  const prioritizedOpportunities = [...openLeads]
    .sort((a, b) => {
      const aNeedsFollowUp =
        !a.next_follow_up_date || isTodayOrPast(a.next_follow_up_date);
      const bNeedsFollowUp =
        !b.next_follow_up_date || isTodayOrPast(b.next_follow_up_date);

      if (aNeedsFollowUp !== bNeedsFollowUp) {
        return aNeedsFollowUp ? -1 : 1;
      }

      return Number(b.estimated_value || 0) - Number(a.estimated_value || 0);
    })
    .slice(0, 12);

  const statusGroups = Array.from(
    openLeads.reduce(
      (map, lead) => {
        const status = lead.status || "Open";

        const current = map.get(status) || {
          status,
          count: 0,
          value: 0,
          followUpNeeded: 0,
          topOpportunity: null as LeadRecord | null,
        };

        current.count += 1;
        current.value += Number(lead.estimated_value || 0);

        if (
          !lead.next_follow_up_date ||
          isTodayOrPast(lead.next_follow_up_date)
        ) {
          current.followUpNeeded += 1;
        }

        if (
          !current.topOpportunity ||
          Number(lead.estimated_value || 0) >
            Number(current.topOpportunity.estimated_value || 0)
        ) {
          current.topOpportunity = lead;
        }

        map.set(status, current);

        return map;
      },
      new Map<
        string,
        {
          status: string;
          count: number;
          value: number;
          followUpNeeded: number;
          topOpportunity: LeadRecord | null;
        }
      >(),
    ),
  )
    .map(([, group]) => group)
    .sort((a, b) => b.value - a.value);

  const recentlyClosed = [...wonLeads, ...lostLeads]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 6);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Pipeline"
          title="Open opportunities"
          description="Track potential business, follow-up timing, source quality, and pipeline value."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/leads"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Manage opportunities
              </Link>

              <Link
                href="/imports"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Import data
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Open pipeline"
            value={formatCurrency(openPipelineValue)}
            helper={`${openLeads.length} open opportunities`}
            tone={openPipelineValue > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Needs follow-up"
            value={followUpNeeded.length}
            helper="Missing, due, or overdue follow-ups"
            tone={followUpNeeded.length > 0 ? "warning" : "positive"}
          />

          <StatCard
            label="Won value"
            value={formatCurrency(wonPipelineValue)}
            helper={`${wonLeads.length} won opportunities`}
            tone={wonPipelineValue > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Cleanup issues"
            value={cleanupGroups.reduce((sum, item) => sum + item.count, 0)}
            helper="Missing source, estimate, or linked person"
            tone={cleanupGroups.length > 0 ? "warning" : "positive"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr] items-start">
          <SectionCard
            title="Open opportunities"
            description="Prioritized by follow-up need, missing details, and estimated value."
          >
            {prioritizedOpportunities.length === 0 ? (
              <EmptyState
                title="No open opportunities"
                description="New opportunities will appear here when they are added or imported."
              />
            ) : (
              <div>
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {followUpNeeded.length} need follow-up
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Open opportunities are sorted by follow-up risk and value.
                    </p>
                  </div>

                  <Link
                    href="/leads"
                    className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Manage all
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {prioritizedOpportunities.map((lead) => {
                    const customer = lead.customer_id
                      ? customerById.get(lead.customer_id)
                      : null;

                    const issues = getOpportunityIssues(lead);

                    return (
                      <article key={lead.id} className="p-4">
                        <div className="grid gap-4 md:grid-cols-[1fr_130px_160px_90px] md:items-center">
                          <div>
                            <p className="font-semibold text-slate-950">
                              {lead.service_requested || "Untitled opportunity"}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {customer?.name ||
                                lead.source ||
                                "No person or source saved"}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {issues.slice(0, 3).map((issue) => (
                                <StatusBadge
                                  key={issue.label}
                                  tone={issue.tone}
                                >
                                  {issue.label}
                                </StatusBadge>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-500">
                              Value
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {formatCurrency(lead.estimated_value)}
                            </p>

                            <p className="mt-3 text-xs font-medium text-slate-500">
                              Source
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {lead.source || "Not set"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-500">
                              Next step
                            </p>
                            <div className="mt-1">
                              <StatusBadge
                                tone={getFollowUpTone(lead.next_follow_up_date)}
                              >
                                {getFollowUpText(lead.next_follow_up_date)}
                              </StatusBadge>
                            </div>

                            <p className="mt-3 text-xs font-medium text-slate-500">
                              Status
                            </p>
                            <div className="mt-1">
                              <StatusBadge tone={getStatusTone(lead.status)}>
                                {lead.status || "Open"}
                              </StatusBadge>
                            </div>
                          </div>

                          <div className="md:text-right">
                            <Link
                              href={`/leads/${lead.id}/edit`}
                              className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Open
                            </Link>
                          </div>
                        </div>

                        {lead.notes && (
                          <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                            {lead.notes}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="Pipeline health"
              description="Grouped issues affecting pipeline reporting."
            >
              {cleanupGroups.length === 0 ? (
                <EmptyState
                  title="Pipeline data looks clean"
                  description="No missing sources, estimates, or customer links were found."
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {cleanupGroups.map((item) => (
                    <article
                      key={item.id}
                      className="flex items-start justify-between gap-4 p-4"
                    >
                      <div>
                        <StatusBadge tone="neutral">{item.label}</StatusBadge>
                        <p className="mt-2 font-semibold text-slate-950">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {item.detail}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {item.count}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </section>

        <SectionCard
          title="Pipeline by status"
          description="Open opportunity value, count, and follow-up risk by current stage."
        >
          {statusGroups.length === 0 ? (
            <EmptyState
              title="No open pipeline"
              description="Add or import opportunities to start building a pipeline."
            />
          ) : (
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {statusGroups.map((group) => (
                <div
                  key={group.status}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <StatusBadge tone={getStatusTone(group.status)}>
                        {group.status}
                      </StatusBadge>

                      <p className="mt-3 text-2xl font-semibold text-slate-950">
                        {formatCurrency(group.value)}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {group.count} open opportunities
                      </p>
                    </div>

                    {group.followUpNeeded > 0 && (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                        {group.followUpNeeded} follow-up
                      </span>
                    )}
                  </div>

                  {group.topOpportunity && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Top opportunity
                      </p>

                      <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-950">
                        {group.topOpportunity.service_requested ||
                          "Untitled opportunity"}
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-700">
                          {formatCurrency(group.topOpportunity.estimated_value)}
                        </p>

                        <Link
                          href={`/leads/${group.topOpportunity.id}/edit`}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard
          title="Recently closed"
          description="Won and lost opportunities moved out of the active pipeline."
        >
          {recentlyClosed.length === 0 ? (
            <EmptyState
              title="No closed opportunities yet"
              description="Won or lost opportunities will appear here once statuses are updated."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentlyClosed.map((lead) => (
                <article
                  key={lead.id}
                  className="grid gap-3 p-4 md:grid-cols-[1fr_140px_120px_100px] md:items-center"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {lead.service_requested || "Untitled opportunity"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {lead.source || "No source saved"}
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-slate-700">
                    {formatCurrency(lead.estimated_value)}
                  </p>

                  <StatusBadge tone={getStatusTone(lead.status)}>
                    {lead.status || "Closed"}
                  </StatusBadge>

                  <div className="md:text-right">
                    <Link
                      href={`/leads/${lead.id}/edit`}
                      className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      View
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}





