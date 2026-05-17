import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DismissError } from "@/components/ui/DismissError";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { formatDateOnly, isTodayOrPast } from "@/lib/date-format";
import { formatCurrency, getFormString, getOptionalNumber } from "@/lib/utils";
import { getOpportunityTone } from "@/lib/status";
import { getIndustryProfile } from "@/lib/industry-profiles";

type OpportunityRecord = {
  id: string;
  customer_id: string | null;
  service_requested: string | null;
  status: string | null;
  estimated_value: number | null;
  source: string | null;
  next_follow_up_date: string | null;
  notes: string | null;
  created_at: string;
};

type PersonRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

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
    return "No follow-up";
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

function getOpportunityIssues(opportunity: OpportunityRecord) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
  }[] = [];

  if (!opportunity.customer_id) {
    issues.push({
      label: "Link person",
      tone: "warning",
    });
  }

  if (!opportunity.source) {
    issues.push({
      label: "Add source",
      tone: "neutral",
    });
  }

  if (
    opportunity.estimated_value === null ||
    opportunity.estimated_value === undefined
  ) {
    issues.push({
      label: "Add estimate",
      tone: "neutral",
    });
  }

  if (!opportunity.next_follow_up_date) {
    issues.push({
      label: "Add follow-up",
      tone: "warning",
    });
  } else if (isTodayOrPast(opportunity.next_follow_up_date)) {
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

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorParam } = await searchParams;
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

  async function createOpportunity(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const currentCompany = await getCurrentCompany();

    if (!currentCompany) {
      redirect("/onboarding");
    }

    const { company } = currentCompany;

    const customerId = getFormString(formData, "customer_id");
    const serviceRequested = getFormString(formData, "service_requested");
    const status = getFormString(formData, "status") || "New";
    const estimatedValue = getOptionalNumber(formData, "estimated_value");
    const source = getFormString(formData, "source");
    const nextFollowUpDate = getFormString(formData, "next_follow_up_date");
    const notes = getFormString(formData, "notes");

    if (!serviceRequested) {
      redirect("/leads?error=Opportunity+name+is+required.");
    }

    const { error } = await supabase.from("leads").insert({
      company_id: company.id,
      customer_id: customerId || null,
      service_requested: serviceRequested,
      status,
      estimated_value: estimatedValue,
      source: source || null,
      next_follow_up_date: nextFollowUpDate || null,
      notes: notes || null,
    });

    if (error) {
      redirect(`/leads?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/leads");
    revalidatePath("/crm");
    revalidatePath("/workspace");
    redirect("/leads");
  }

  const [opportunitiesResult, peopleResult] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, customer_id, service_requested, status, estimated_value, source, next_follow_up_date, notes, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(250),

    supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  if (opportunitiesResult.error) {
    throw new Error(opportunitiesResult.error.message);
  }

  if (peopleResult.error) {
    throw new Error(peopleResult.error.message);
  }

  const opportunities = (opportunitiesResult.data || []) as OpportunityRecord[];
  const people = (peopleResult.data || []) as PersonRecord[];

  const personById = new Map(people.map((person) => [person.id, person]));

  const openOpportunities = opportunities.filter(
    (opportunity) => !isWon(opportunity.status) && !isLost(opportunity.status),
  );

  const wonOpportunities = opportunities.filter((opportunity) =>
    isWon(opportunity.status),
  );

  const lostOpportunities = opportunities.filter((opportunity) =>
    isLost(opportunity.status),
  );

  const openValue = openOpportunities.reduce(
    (sum, opportunity) => sum + Number(opportunity.estimated_value || 0),
    0,
  );

  const wonValue = wonOpportunities.reduce(
    (sum, opportunity) => sum + Number(opportunity.estimated_value || 0),
    0,
  );

  const followUpNeeded = openOpportunities.filter(
    (opportunity) =>
      !opportunity.next_follow_up_date ||
      isTodayOrPast(opportunity.next_follow_up_date),
  );

  const missingSource = openOpportunities.filter(
    (opportunity) => !opportunity.source,
  );

  const missingEstimate = openOpportunities.filter(
    (opportunity) =>
      opportunity.estimated_value === null ||
      opportunity.estimated_value === undefined,
  );

  const missingPerson = openOpportunities.filter(
    (opportunity) => !opportunity.customer_id,
  );

  const cleanupGroups = [
    {
      id: "missing-person",
      label: `Link ${profile.labels.customerSingular.toLowerCase()}`,
      title: `${profile.labels.leadPlural} need ${profile.labels.customerPlural.toLowerCase()} or businesses`,
      detail: "Pipeline records should usually be connected to someone.",
      count: missingPerson.length,
    },
    {
      id: "missing-source",
      label: "Add source",
      title: `${profile.labels.leadPlural} need sources`,
      detail: "Source tracking helps show which marketing is working.",
      count: missingSource.length,
    },
    {
      id: "missing-estimate",
      label: "Add estimate",
      title: `${profile.labels.leadPlural} need estimated values`,
      detail: `Estimated value helps prioritize important ${profile.labels.leadPlural.toLowerCase()}.`,
      count: missingEstimate.length,
    },
  ].filter((item) => item.count > 0);

  const prioritizedOpenOpportunities = [...openOpportunities]
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
    .slice(0, 20);

  const recentlyClosed = [...wonOpportunities, ...lostOpportunities]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 8);

  const sourceGroups = Array.from(
    openOpportunities.reduce((map, opportunity) => {
      const source = opportunity.source || "No source";
      const current = map.get(source) || {
        source,
        count: 0,
        value: 0,
      };

      current.count += 1;
      current.value += Number(opportunity.estimated_value || 0);
      map.set(source, current);

      return map;
    }, new Map<string, { source: string; count: number; value: number }>()),
  )
    .map(([, group]) => group)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
      businessSector={company.business_sector}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow={profile.labels.leadPlural}
          title={`Manage ${profile.labels.leadPlural.toLowerCase()}`}
          description={`Create, review, and clean up ${profile.labels.leadPlural.toLowerCase()} before they become ${profile.labels.jobPlural.toLowerCase()} and ${profile.labels.salePlural.toLowerCase()}.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/crm"
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-3 py-2 text-[13px] font-semibold text-ud-muted hover:text-ud-ink"
              >
                Pipeline view
              </Link>

              <Link
                href="/imports"
                className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#4A3FA8] px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90"
              >
                Import data
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Open value"
            value={formatCurrency(openValue)}
            helper={`${openOpportunities.length} open ${profile.labels.leadPlural.toLowerCase()}`}
            tone={openValue > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Needs follow-up"
            value={followUpNeeded.length}
            helper="Missing, due, or overdue"
            tone={followUpNeeded.length > 0 ? "warning" : "positive"}
          />

          <StatCard
            label="Won value"
            value={formatCurrency(wonValue)}
            helper={`${wonOpportunities.length} won ${profile.labels.leadPlural.toLowerCase()}`}
            tone={wonValue > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Cleanup issues"
            value={cleanupGroups.reduce((sum, item) => sum + item.count, 0)}
            helper="Missing person, source, or estimate"
            tone={cleanupGroups.length > 0 ? "warning" : "positive"}
          />
        </section>

        <SectionCard
          title={`Add ${profile.labels.leadSingular.toLowerCase()}`}
          description={`Create a new ${profile.labels.leadSingular.toLowerCase()} manually and optionally link it to a ${profile.labels.customerSingular.toLowerCase()} or business.`}
        >
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
              <div>
                <p className="text-[13.5px] font-semibold text-ud-ink">Quick add</p>
                <p className="mt-1 text-[13px] text-ud-muted">
                  Add a quote, request, estimate, deal, or potential job.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#4A3FA8] px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90 group-open:hidden">
                Add {profile.labels.leadSingular.toLowerCase()}
              </span>

              <span className="hidden items-center gap-1.5 rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-3 py-2 text-[13px] font-semibold text-ud-muted hover:text-ud-ink group-open:inline-flex">
                Close
              </span>
            </summary>

            <form
              action={createOpportunity}
              className="border-t border-[rgba(23,22,20,0.05)] p-5"
            >
              {errorParam && <DismissError message={errorParam} />}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-ud-muted">
                  Link to person or business
                  <select
                    name="customer_id"
                    className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                  >
                    <option value="">No linked {profile.labels.customerSingular.toLowerCase()} yet</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name ||
                          person.email ||
                          person.phone ||
                          "Unnamed person"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-ud-muted">
                  Status
                  <select
                    name="status"
                    defaultValue="New"
                    className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Estimate Sent">Estimate Sent</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
                <label className="text-sm font-medium text-ud-muted">
                  Opportunity name
                  <input
                    name="service_requested"
                    required
                    placeholder="Website redesign, flooring quote, monthly service plan..."
                    className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                  />
                </label>

                <label className="text-sm font-medium text-ud-muted">
                  Estimated value
                  <input
                    name="estimated_value"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="2500"
                    className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-ud-muted">
                  Source
                  <input
                    name="source"
                    placeholder="Referral, Google, Facebook, Website..."
                    className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                  />
                </label>

                <label className="text-sm font-medium text-ud-muted">
                  Next follow-up
                  <input
                    name="next_follow_up_date"
                    type="date"
                    className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                  />
                </label>
              </div>

              <label className="mt-4 block text-sm font-medium text-ud-muted">
                Notes
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Add quote notes, next steps, or context..."
                  className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                />
              </label>

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#4A3FA8] px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90"
                >
                  Create {profile.labels.leadSingular.toLowerCase()}
                </button>
              </div>
            </form>
          </details>
        </SectionCard>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr] items-start">
          <SectionCard
            title={`Open ${profile.labels.leadPlural.toLowerCase()}`}
            description="Prioritized by follow-up need, missing details, and estimated value."
          >
            {prioritizedOpenOpportunities.length === 0 ? (
              <EmptyState
                title={`No open ${profile.labels.leadPlural.toLowerCase()}`}
                description={`Add or import ${profile.labels.leadPlural.toLowerCase()} to start building the pipeline.`}
              />
            ) : (
              <div>
                {prioritizedOpenOpportunities.map((opportunity) => {
                  const person = opportunity.customer_id
                    ? personById.get(opportunity.customer_id)
                    : null;

                  const issues = getOpportunityIssues(opportunity);

                  return (
                    <div
                      key={opportunity.id}
                      className="flex items-center gap-3.5 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 hover:bg-ud-surface-soft transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-ud-ink truncate">
                          {opportunity.service_requested || "Untitled opportunity"}
                        </p>
                        <p className="text-[12px] text-ud-muted mt-0.5 truncate">
                          {person?.name ||
                            opportunity.source ||
                            `No ${profile.labels.customerSingular.toLowerCase()} or source saved`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge
                          tone={getFollowUpTone(opportunity.next_follow_up_date)}
                        >
                          {getFollowUpText(opportunity.next_follow_up_date)}
                        </StatusBadge>
                        <StatusBadge tone={issues[0].tone}>
                          {issues[0].label}
                        </StatusBadge>
                        <span className="text-[12px] text-ud-muted hidden md:block">
                          {formatCurrency(opportunity.estimated_value)}
                        </span>
                        <Link
                          href={`/leads/${opportunity.id}/edit`}
                          className="text-[12px] font-semibold text-[#4A3FA8] hover:underline"
                        >
                          Open →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title={`${profile.labels.leadSingular} health`}
              description="Grouped issues affecting pipeline quality."
            >
              {cleanupGroups.length === 0 ? (
                <EmptyState
                  title={`${profile.labels.leadPlural} look clean`}
                  description={`No missing ${profile.labels.customerSingular.toLowerCase()} links, sources, or estimates were found.`}
                />
              ) : (
                <div>
                  {cleanupGroups.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3.5 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-ud-ink truncate">
                          {item.title}
                        </p>
                        <p className="text-[12px] text-ud-muted mt-0.5 truncate">
                          {item.detail}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge tone="neutral">{item.label}</StatusBadge>
                        <span className="rounded-full bg-ud-surface-sunk px-3 py-1 text-xs font-semibold text-ud-muted">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Sources"
              description="Open opportunity value by source."
            >
              {sourceGroups.length === 0 ? (
                <EmptyState
                  title="No source data yet"
                  description="Add sources to understand where opportunities come from."
                />
              ) : (
                <div>
                  {sourceGroups.map((group) => (
                    <div
                      key={group.source}
                      className="flex items-center gap-3.5 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-ud-ink truncate">
                          {group.source}
                        </p>
                        <p className="text-[12px] text-ud-muted mt-0.5">
                          {group.count} {profile.labels.leadPlural.toLowerCase()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-[13px] font-semibold text-ud-ink">
                          {formatCurrency(group.value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </section>

        <SectionCard
          title="Recently closed"
          description={`Won and lost ${profile.labels.leadPlural.toLowerCase()} moved out of the active pipeline.`}
        >
          {recentlyClosed.length === 0 ? (
            <EmptyState
              title={`No closed ${profile.labels.leadPlural.toLowerCase()} yet`}
              description={`Won or lost ${profile.labels.leadPlural.toLowerCase()} will appear here once statuses are updated.`}
            />
          ) : (
            <div>
              {recentlyClosed.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="flex items-center gap-3.5 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 hover:bg-ud-surface-soft transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-ud-ink truncate">
                      {opportunity.service_requested || "Untitled opportunity"}
                    </p>
                    <p className="text-[12px] text-ud-muted mt-0.5 truncate">
                      {opportunity.source || "No source saved"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[12px] text-ud-muted hidden sm:block">
                      {formatCurrency(opportunity.estimated_value)}
                    </span>
                    <StatusBadge tone={getOpportunityTone(opportunity.status)}>
                      {opportunity.status || "Closed"}
                    </StatusBadge>
                    <Link
                      href={`/leads/${opportunity.id}/edit`}
                      className="text-[12px] font-semibold text-[#4A3FA8] hover:underline"
                    >
                      Open →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
