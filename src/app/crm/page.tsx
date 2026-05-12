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
import {
  formatDateOnly,
  isTodayOrPast,
  isOverdue,
  isDueToday,
} from "@/lib/date-format";
import { formatCurrency } from "@/lib/utils";
import {
  isClosedOpportunity,
  getOpportunityTone,
} from "@/lib/status";
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

function isClosed(status: string | null) {
  return isClosedOpportunity(status);
}

function getFollowUpLabel(date: string | null) {
  if (!date) {
    return "Add follow-up";
  }

  if (isOverdue(date)) {
    return `Overdue ${formatDateOnly(date)}`;
  }

  if (isDueToday(date)) {
    return "Due today";
  }

  return `Due ${formatDateOnly(date)}`;
}

function getFollowUpTone(date: string | null) {
  if (!date) {
    return "warning" as const;
  }

  if (isOverdue(date)) {
    return "danger" as const;
  }

  if (isDueToday(date)) {
    return "warning" as const;
  }

  return "neutral" as const;
}

function getStageDescription(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("new")) {
    return "New opportunity that needs first review or contact.";
  }

  if (normalized.includes("contact")) {
    return "Contact has started and the opportunity needs next steps.";
  }

  if (normalized.includes("estimate")) {
    return "Estimate has been sent and needs follow-up.";
  }

  if (normalized.includes("follow")) {
    return "Opportunity is waiting on a follow-up or response.";
  }

  if (normalized.includes("won")) {
    return "Opportunity was won and can move toward work or revenue.";
  }

  if (
    normalized.includes("lost") ||
    normalized.includes("cancel") ||
    normalized.includes("declined")
  ) {
    return "Opportunity is no longer moving forward.";
  }

  return "Opportunity using a custom or imported status.";
}

function getOpportunityNextStep(opportunity: OpportunityRecord) {
  if (!opportunity.customer_id) {
    return "Link this opportunity to the person or business it belongs to.";
  }

  if (!opportunity.source) {
    return "Add a source so you know where this opportunity came from.";
  }

  if (
    opportunity.estimated_value === null ||
    opportunity.estimated_value === undefined
  ) {
    return "Add an estimated value so the pipeline can be prioritized.";
  }

  if (!opportunity.next_follow_up_date && !isClosed(opportunity.status)) {
    return "Add a next follow-up date so this does not get forgotten.";
  }

  if (
    opportunity.next_follow_up_date &&
    isTodayOrPast(opportunity.next_follow_up_date) &&
    !isClosed(opportunity.status)
  ) {
    return "This opportunity needs follow-up attention.";
  }

  if (isWon(opportunity.status)) {
    return "This opportunity is won. Confirm it is reflected in work or revenue.";
  }

  if (isLost(opportunity.status)) {
    return "This opportunity is closed lost and should stay out of active pipeline.";
  }

  return "Keep this opportunity moving toward a decision.";
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

  if (!opportunity.next_follow_up_date && !isClosed(opportunity.status)) {
    issues.push({
      label: "Add follow-up",
      tone: "warning",
    });
  }

  if (
    opportunity.next_follow_up_date &&
    isTodayOrPast(opportunity.next_follow_up_date) &&
    !isClosed(opportunity.status)
  ) {
    issues.push({
      label: "Follow-up due",
      tone: isOverdue(opportunity.next_follow_up_date) ? "danger" : "warning",
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

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const selectedStatus = params.status ? decodeURIComponent(params.status) : "";

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
    (opportunity) => !isClosed(opportunity.status),
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

  const missingEstimate = openOpportunities.filter(
    (opportunity) =>
      opportunity.estimated_value === null ||
      opportunity.estimated_value === undefined,
  );

  const stageGroups = Array.from(
    opportunities.reduce((map, opportunity) => {
      const status = opportunity.status || "New";
      const current = map.get(status) || {
        status,
        count: 0,
        value: 0,
        followUpNeeded: 0,
      };

      current.count += 1;
      current.value += Number(opportunity.estimated_value || 0);

      if (
        !isClosed(status) &&
        (!opportunity.next_follow_up_date ||
          isTodayOrPast(opportunity.next_follow_up_date))
      ) {
        current.followUpNeeded += 1;
      }

      map.set(status, current);

      return map;
    }, new Map<string, { status: string; count: number; value: number; followUpNeeded: number }>()),
  )
    .map(([, group]) => group)
    .sort((a, b) => {
      const order = [
        "New",
        "Contacted",
        "Estimate Sent",
        "Follow Up",
        "Won",
        "Lost",
      ];

      const aIndex = order.indexOf(a.status);
      const bIndex = order.indexOf(b.status);

      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
      }

      return b.count - a.count;
    });

  const prioritizedOpportunities = [...openOpportunities].sort((a, b) => {
    const aNeedsFollowUp =
      !a.next_follow_up_date || isTodayOrPast(a.next_follow_up_date);
    const bNeedsFollowUp =
      !b.next_follow_up_date || isTodayOrPast(b.next_follow_up_date);

    if (aNeedsFollowUp !== bNeedsFollowUp) {
      return aNeedsFollowUp ? -1 : 1;
    }

    return Number(b.estimated_value || 0) - Number(a.estimated_value || 0);
  });

  const visibleOpportunities = selectedStatus
    ? opportunities.filter(
        (opportunity) => (opportunity.status || "New") === selectedStatus,
      )
    : prioritizedOpportunities;

  const recentlyClosed = [...wonOpportunities, ...lostOpportunities]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 8);

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
          eyebrow="Pipeline"
          title={`Track ${profile.labels.leadSingular.toLowerCase()} movement`}
          description={`See where ${profile.labels.leadPlural.toLowerCase()} sit, what needs follow-up, and which records are ready to become ${profile.labels.jobPlural.toLowerCase()} or ${profile.labels.salePlural.toLowerCase()}.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/leads"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Manage opportunities
              </Link>

              <Link
                href="/follow-ups"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Follow-ups
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Open pipeline"
            value={formatCurrency(openValue)}
            helper={`${openOpportunities.length} active opportunities`}
            tone={openValue > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Follow-up needed"
            value={followUpNeeded.length}
            helper="Missing, due, or overdue follow-ups"
            tone={followUpNeeded.length > 0 ? "warning" : "positive"}
          />

          <StatCard
            label="Won value"
            value={formatCurrency(wonValue)}
            helper={`${wonOpportunities.length} won opportunities`}
            tone={wonValue > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Missing estimates"
            value={missingEstimate.length}
            helper="Open opportunities without value"
            tone={missingEstimate.length > 0 ? "warning" : "positive"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr] items-start">
          <SectionCard
            title={
              selectedStatus
                ? `${selectedStatus} opportunities`
                : "Pipeline queue"
            }
            description={
              selectedStatus
                ? `Showing opportunities currently marked ${selectedStatus}.`
                : "Open opportunities sorted by follow-up need and estimated value."
            }
          >
            {visibleOpportunities.length === 0 ? (
              <EmptyState
                title="No opportunities found"
                description="Create or import opportunities to start building the pipeline."
              />
            ) : (
              <>
                {selectedStatus && (
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Filtered by stage: {selectedStatus}
                    </p>

                    <Link
                      href="/crm"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Clear filter
                    </Link>
                  </div>
                )}

                <div className="divide-y divide-slate-100">
                  {visibleOpportunities.map((opportunity) => {
                    const person = opportunity.customer_id
                      ? personById.get(opportunity.customer_id)
                      : null;

                    const issues = getOpportunityIssues(opportunity);

                    return (
                      <Link key={opportunity.id} href={`/leads/${opportunity.id}/edit`} className="block p-4 transition-colors hover:bg-slate-50">
                        <div className="grid gap-4 md:grid-cols-[1fr_130px_150px] md:items-start">
                          <div>
                            <p className="font-semibold text-slate-950">
                              {opportunity.service_requested ||
                                "Untitled opportunity"}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {person?.name ||
                                opportunity.source ||
                                "No person or source saved"}
                            </p>

                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {getOpportunityNextStep(opportunity)}
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
                              {formatCurrency(opportunity.estimated_value)}
                            </p>

                            <p className="mt-3 text-xs font-medium text-slate-500">
                              Source
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {opportunity.source || "Not set"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-500">
                              Follow-up
                            </p>
                            <div className="mt-1">
                              <StatusBadge
                                tone={getFollowUpTone(
                                  opportunity.next_follow_up_date,
                                )}
                              >
                                {getFollowUpLabel(
                                  opportunity.next_follow_up_date,
                                )}
                              </StatusBadge>
                            </div>

                            <p className="mt-3 text-xs font-medium text-slate-500">
                              Stage
                            </p>
                            <div className="mt-1">
                              <StatusBadge
                                tone={getOpportunityTone(opportunity.status)}
                              >
                                {opportunity.status || "New"}
                              </StatusBadge>
                            </div>
                          </div>

                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard
            title="Pipeline stages"
            description="Use stages to filter the opportunity queue."
          >
            {stageGroups.length === 0 ? (
              <EmptyState
                title="No stages yet"
                description="Stages will appear after opportunities are added."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {stageGroups.map((group) => (
                  <article
                    key={group.status}
                    className="grid gap-3 p-4 md:grid-cols-[1fr_90px] md:items-center"
                  >
                    <div>
                      <StatusBadge tone={getOpportunityTone(group.status)}>
                        {group.status}
                      </StatusBadge>

                      <p className="mt-2 font-semibold text-slate-950">
                        {group.count} opportunities
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {getStageDescription(group.status)}
                      </p>

                      {!isClosed(group.status) && group.followUpNeeded > 0 && (
                        <span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          {group.followUpNeeded} need follow-up
                        </span>
                      )}
                    </div>

                    <div className="md:text-right">
                      <Link
                        href={
                          selectedStatus === group.status
                            ? "/crm"
                            : `/crm?status=${encodeURIComponent(group.status)}`
                        }
                        className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {selectedStatus === group.status ? "Clear" : "Review"}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

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
              {recentlyClosed.map((opportunity) => {
                const person = opportunity.customer_id
                  ? personById.get(opportunity.customer_id)
                  : null;

                return (
                  <Link
                    key={opportunity.id}
                    href={`/leads/${opportunity.id}/edit`}
                    className="grid gap-3 p-4 transition-colors hover:bg-slate-50 md:grid-cols-[1fr_130px_120px] md:items-center"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {opportunity.service_requested ||
                          "Untitled opportunity"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {person?.name ||
                          opportunity.source ||
                          "No source saved"}
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-slate-700">
                      {formatCurrency(opportunity.estimated_value)}
                    </p>

                    <StatusBadge tone={getOpportunityTone(opportunity.status)}>
                      {opportunity.status || "Closed"}
                    </StatusBadge>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
