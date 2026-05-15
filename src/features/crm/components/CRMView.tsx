import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { CRMPageData } from "../queries";

type Lead = CRMPageData["leads"][number];

const stageColorDot: Record<string, string> = {
  "New": "bg-slate-400",
  "Contacted": "bg-blue-500",
  "Estimate Sent": "bg-[#7A8C2A]",
  "Follow Up": "bg-amber-500",
  "Won": "bg-emerald-500",
  "Lost": "bg-slate-300",
};

function getStageDot(status: string) {
  return stageColorDot[status] ?? "bg-slate-400";
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

function isClosed(status: string | null) {
  return isClosedOpportunity(status);
}

function getFollowUpLabel(date: string | null) {
  if (!date) return "Add follow-up";
  if (isOverdue(date)) return `Overdue ${formatDateOnly(date)}`;
  if (isDueToday(date)) return "Due today";
  return `Due ${formatDateOnly(date)}`;
}

function getFollowUpTone(date: string | null) {
  if (!date) return "warning" as const;
  if (isOverdue(date)) return "danger" as const;
  if (isDueToday(date)) return "warning" as const;
  return "neutral" as const;
}

function getOpportunityNextStep(opportunity: Lead) {
  if (!opportunity.customer_id) return "Link this opportunity to the person or business it belongs to.";
  if (!opportunity.source) return "Add a source so you know where this opportunity came from.";
  if (opportunity.estimated_value === null || opportunity.estimated_value === undefined)
    return "Add an estimated value so the pipeline can be prioritized.";
  if (!opportunity.next_follow_up_date && !isClosed(opportunity.status))
    return "Add a next follow-up date so this does not get forgotten.";
  if (
    opportunity.next_follow_up_date &&
    isTodayOrPast(opportunity.next_follow_up_date) &&
    !isClosed(opportunity.status)
  )
    return "This opportunity needs follow-up attention.";
  if (isWon(opportunity.status)) return "This opportunity is won. Confirm it is reflected in work or revenue.";
  if (isLost(opportunity.status)) return "This opportunity is closed lost and should stay out of active pipeline.";
  return "Keep this opportunity moving toward a decision.";
}

function getOpportunityIssues(opportunity: Lead) {
  const issues: { label: string; tone: "success" | "warning" | "danger" | "neutral" }[] = [];

  if (!opportunity.customer_id) issues.push({ label: "Link person", tone: "warning" });
  if (!opportunity.source) issues.push({ label: "Add source", tone: "neutral" });
  if (opportunity.estimated_value === null || opportunity.estimated_value === undefined)
    issues.push({ label: "Add estimate", tone: "neutral" });
  if (!opportunity.next_follow_up_date && !isClosed(opportunity.status))
    issues.push({ label: "Add follow-up", tone: "warning" });
  if (
    opportunity.next_follow_up_date &&
    isTodayOrPast(opportunity.next_follow_up_date) &&
    !isClosed(opportunity.status)
  )
    issues.push({ label: "Follow-up due", tone: isOverdue(opportunity.next_follow_up_date) ? "danger" : "warning" });

  if (issues.length === 0) issues.push({ label: "Looks clean", tone: "success" });

  return issues;
}

type Props = CRMPageData & {
  selectedStatus: string;
  profile: IndustryProfile;
};

export function CRMView({ leads, customers, selectedStatus, profile }: Props) {
  const personById = new Map(customers.map((c) => [c.id, c]));

  const openOpportunities = leads.filter((o) => !isClosed(o.status));
  const wonOpportunities = leads.filter((o) => isWon(o.status));
  const lostOpportunities = leads.filter((o) => isLost(o.status));

  const openValue = openOpportunities.reduce(
    (sum, o) => sum + Number(o.estimated_value || 0),
    0,
  );
  const wonValue = wonOpportunities.reduce(
    (sum, o) => sum + Number(o.estimated_value || 0),
    0,
  );

  const followUpNeeded = openOpportunities.filter(
    (o) => !o.next_follow_up_date || isTodayOrPast(o.next_follow_up_date),
  );
  const missingEstimate = openOpportunities.filter(
    (o) => o.estimated_value === null || o.estimated_value === undefined,
  );

  const stageGroups = Array.from(
    leads.reduce((map, opportunity) => {
      const status = opportunity.status || "New";
      const current = map.get(status) || { status, count: 0, value: 0, followUpNeeded: 0 };
      current.count += 1;
      current.value += Number(opportunity.estimated_value || 0);
      if (
        !isClosed(status) &&
        (!opportunity.next_follow_up_date || isTodayOrPast(opportunity.next_follow_up_date))
      ) {
        current.followUpNeeded += 1;
      }
      map.set(status, current);
      return map;
    }, new Map<string, { status: string; count: number; value: number; followUpNeeded: number }>()),
  )
    .map(([, group]) => group)
    .sort((a, b) => {
      const order = ["New", "Contacted", "Estimate Sent", "Follow Up", "Won", "Lost"];
      const aIndex = order.indexOf(a.status);
      const bIndex = order.indexOf(b.status);
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
      }
      return b.count - a.count;
    });

  const prioritizedOpportunities = [...openOpportunities].sort((a, b) => {
    const aNeedsFollowUp = !a.next_follow_up_date || isTodayOrPast(a.next_follow_up_date);
    const bNeedsFollowUp = !b.next_follow_up_date || isTodayOrPast(b.next_follow_up_date);
    if (aNeedsFollowUp !== bNeedsFollowUp) return aNeedsFollowUp ? -1 : 1;
    return Number(b.estimated_value || 0) - Number(a.estimated_value || 0);
  });

  const visibleOpportunities = selectedStatus
    ? leads.filter((o) => (o.status || "New") === selectedStatus)
    : prioritizedOpportunities;

  const recentlyClosed = [...wonOpportunities, ...lostOpportunities]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Pipeline"
        title={`Track ${profile.labels.leadSingular.toLowerCase()} movement`}
        description={`See where ${profile.labels.leadPlural.toLowerCase()} sit, what needs follow-up, and which records are ready to become ${profile.labels.jobPlural.toLowerCase()} or ${profile.labels.salePlural.toLowerCase()}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/leads"
              className="rounded-2xl bg-[#1D2D3E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a3f57]"
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

      <SectionCard
        title="Pipeline stages"
        description="Drag cards or click to edit."
      >
        {/* Kanban board */}
        <div className="overflow-x-auto">
          <div className="flex gap-3.5 pb-2" style={{ minWidth: "max-content" }}>
            {stageGroups.map((group) => {
              const groupLeads = leads.filter((o) => (o.status || "New") === group.status);
              return (
                <div key={group.status} className="w-[260px] shrink-0">
                  {/* Column header */}
                  <div className="mb-2 rounded-[20px] border border-slate-200 bg-white overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50 px-3.5 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${getStageDot(group.status)}`} />
                          <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700">{group.status}</p>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400">{group.count}</p>
                      </div>
                      <p className="mt-0.5 font-mono text-[11.5px] font-semibold text-slate-400">
                        {formatCurrency(group.value)}
                      </p>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2 p-2.5">
                      {groupLeads.slice(0, 5).map((opp) => {
                        const person = opp.customer_id ? personById.get(opp.customer_id) : null;
                        const estimatedValue = Number(opp.estimated_value || 0);
                        const needsFollowUp = !opp.next_follow_up_date || isTodayOrPast(opp.next_follow_up_date);
                        const priorityLabel = estimatedValue > 5000 ? "HIGH" : estimatedValue > 1000 ? "MED" : "LOW";
                        const priorityColor = estimatedValue > 5000 ? "text-red-500" : estimatedValue > 1000 ? "text-amber-500" : "text-slate-400";
                        return (
                          <Link
                            key={opp.id}
                            href={`/leads/${opp.id}/edit`}
                            className="block rounded-xl border border-slate-100 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-200 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <p className={`text-[10px] font-bold uppercase tracking-[0.08em] ${priorityColor}`}>{priorityLabel}</p>
                              <p className="font-mono text-[11.5px] font-semibold text-[#7A8C2A]">
                                {estimatedValue > 0 ? formatCurrency(opp.estimated_value) : "—"}
                              </p>
                            </div>
                            <p className="mt-1 text-[12.5px] font-semibold text-slate-950 leading-snug">
                              {opp.service_requested || "Untitled"}
                            </p>
                            <div className="mt-1.5 flex items-center justify-between">
                              <p className="text-[11px] font-medium text-slate-500">
                                {person?.name || opp.source || "No contact"}
                              </p>
                              {needsFollowUp && !isClosed(opp.status) && (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              )}
                            </div>
                          </Link>
                        );
                      })}
                      {groupLeads.length > 5 && (
                        <p className="px-1 text-center text-[11px] font-medium text-slate-400">
                          +{groupLeads.length - 5} more
                        </p>
                      )}
                      {groupLeads.length === 0 && (
                        <p className="py-3 text-center text-[11px] font-medium text-slate-300">Empty</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={selectedStatus ? `${selectedStatus} opportunities` : "Pipeline queue"}
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
                  <Link
                    key={opportunity.id}
                    href={`/leads/${opportunity.id}/edit`}
                    className="block p-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="grid gap-4 md:grid-cols-[1fr_130px_150px] md:items-start">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {opportunity.service_requested || "Untitled opportunity"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {person?.name || opportunity.source || "No person or source saved"}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {getOpportunityNextStep(opportunity)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {issues.slice(0, 3).map((issue) => (
                            <StatusBadge key={issue.label} tone={issue.tone}>
                              {issue.label}
                            </StatusBadge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Value</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatCurrency(opportunity.estimated_value)}
                        </p>
                        <p className="mt-3 text-xs font-medium text-slate-500">Source</p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {opportunity.source || "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Follow-up</p>
                        <div className="mt-1">
                          <StatusBadge tone={getFollowUpTone(opportunity.next_follow_up_date)}>
                            {getFollowUpLabel(opportunity.next_follow_up_date)}
                          </StatusBadge>
                        </div>
                        <p className="mt-3 text-xs font-medium text-slate-500">Stage</p>
                        <div className="mt-1">
                          <StatusBadge tone={getOpportunityTone(opportunity.status)}>
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
                      {opportunity.service_requested || "Untitled opportunity"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {person?.name || opportunity.source || "No source saved"}
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
  );
}
