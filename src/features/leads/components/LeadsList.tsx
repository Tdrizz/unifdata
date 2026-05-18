import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { isTodayOrPast } from "@/lib/date-format";
import { formatCurrency } from "@/lib/utils";
import { getOpportunityTone } from "@/lib/status";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { LeadRow, CustomerRow } from "../types";
import { LeadCreateForm } from "./LeadCreateForm";
import { LeadsTableClient } from "./LeadsTableClient";

const PAGE_SIZE = 50;

type Props = {
  leads: LeadRow[];
  count: number;
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  profile: IndustryProfile;
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

export function LeadsList({ leads, count, customers, profile }: Props) {
  const openOpportunities = leads.filter(
    (l) => !isWon(l.status) && !isLost(l.status),
  );
  const wonOpportunities = leads.filter((l) => isWon(l.status));
  const lostOpportunities = leads.filter((l) => isLost(l.status));

  const openValue = openOpportunities.reduce(
    (sum, l) => sum + Number(l.estimated_value || 0),
    0,
  );
  const wonValue = wonOpportunities.reduce(
    (sum, l) => sum + Number(l.estimated_value || 0),
    0,
  );

  const followUpNeeded = openOpportunities.filter(
    (l) => !l.next_follow_up_date || isTodayOrPast(l.next_follow_up_date),
  );

  const missingSource = openOpportunities.filter((l) => !l.source);
  const missingEstimate = openOpportunities.filter(
    (l) => l.estimated_value === null || l.estimated_value === undefined,
  );
  const missingPerson = openOpportunities.filter((l) => !l.customer_id);

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
      if (aNeedsFollowUp !== bNeedsFollowUp) return aNeedsFollowUp ? -1 : 1;
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
    openOpportunities.reduce((map, l) => {
      const source = l.source || "No source";
      const current = map.get(source) || { source, count: 0, value: 0 };
      current.count += 1;
      current.value += Number(l.estimated_value || 0);
      map.set(source, current);
      return map;
    }, new Map<string, { source: string; count: number; value: number }>()),
  )
    .map(([, group]) => group)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="space-y-5 px-6 pt-5 pb-8">
      <PageHeader
        eyebrow={profile.labels.leadPlural}
        title={`Manage ${profile.labels.leadPlural.toLowerCase()}`}
        description={`Create, review, and clean up ${profile.labels.leadPlural.toLowerCase()} before they become ${profile.labels.jobPlural.toLowerCase()} and ${profile.labels.salePlural.toLowerCase()}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/export/csv?table=leads"
              download
              className="inline-flex items-center gap-1 rounded-lg border border-ud bg-ud-surface px-3 py-1.5 text-sm font-medium text-ud-muted hover:bg-ud-surface-sunk"
            >
              Export CSV
            </a>

            <div className="flex overflow-hidden rounded-[9px] border border-ud">
              <span className="inline-flex items-center px-3 py-2 text-[13px] font-bold text-ud-ink bg-ud-surface-sunk cursor-default">
                List
              </span>
              <Link
                href="/crm"
                className="inline-flex items-center border-l border-ud px-3 py-2 text-[13px] font-semibold text-ud-muted hover:text-ud-ink bg-ud-surface"
              >
                Board
              </Link>
            </div>

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

      <LeadCreateForm customers={customers} profile={profile} />

      <div>
        <SearchInput placeholder={`Search ${profile.labels.leadPlural.toLowerCase()}…`} />
      </div>

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
            <LeadsTableClient
              leads={prioritizedOpenOpportunities}
              customers={customers}
              profile={profile}
              sectionTitle={`open ${profile.labels.leadPlural.toLowerCase()}`}
            />
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
                  <article
                    key={item.id}
                    className="flex items-start justify-between gap-4 p-4"
                  >
                    <div>
                      <StatusBadge tone="neutral">{item.label}</StatusBadge>
                      <p className="mt-2 font-semibold text-ud-ink">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-ud-faint">{item.detail}</p>
                    </div>
                    <span className="inline-flex items-center rounded-[6px] border border-[rgba(23,22,20,0.08)] bg-ud-surface-sunk px-2 py-0.5 text-[11px] font-semibold text-ud-muted">
                      {item.count}
                    </span>
                  </article>
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
                  <article
                    key={group.source}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div>
                      <p className="font-semibold text-ud-ink">{group.source}</p>
                      <p className="mt-1 text-sm text-ud-faint">
                        {group.count} {profile.labels.leadPlural.toLowerCase()}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-ud-muted">
                      {formatCurrency(group.value)}
                    </p>
                  </article>
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
              <Link
                key={opportunity.id}
                href={`/leads/${opportunity.id}/edit`}
                className="grid gap-3 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 transition-colors hover:bg-ud-surface-soft md:grid-cols-[1fr_140px_120px] md:items-center"
              >
                <div>
                  <p className="font-semibold text-ud-ink">
                    {opportunity.service_requested || "Untitled opportunity"}
                  </p>
                  <p className="mt-1 text-sm text-ud-faint">
                    {opportunity.source || "No source saved"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-ud-muted">
                  {formatCurrency(opportunity.estimated_value)}
                </p>
                <StatusBadge tone={getOpportunityTone(opportunity.status)}>
                  {opportunity.status || "Closed"}
                </StatusBadge>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      <Pagination count={count} pageSize={PAGE_SIZE} />
    </div>
  );
}
