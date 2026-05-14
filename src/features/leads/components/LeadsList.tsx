import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { DismissError } from "@/components/ui/DismissError";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { formatDateOnly, isTodayOrPast } from "@/lib/date-format";
import { formatCurrency } from "@/lib/utils";
import { getOpportunityTone } from "@/lib/status";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { LeadRow, CustomerRow } from "../types";
import { createLeadAction } from "../actions";

const PAGE_SIZE = 50;

type Props = {
  leads: LeadRow[];
  count: number;
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  profile: IndustryProfile;
  errorParam?: string;
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
  if (!date) return "No follow-up";
  if (isTodayOrPast(date)) return `Due ${formatDateOnly(date)}`;
  return `Follow up ${formatDateOnly(date)}`;
}

function getFollowUpTone(date: string | null) {
  if (!date) return "warning" as const;
  if (isTodayOrPast(date)) return "danger" as const;
  return "neutral" as const;
}

function getOpportunityIssues(opportunity: LeadRow) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
  }[] = [];

  if (!opportunity.customer_id) {
    issues.push({ label: "Link person", tone: "warning" });
  }
  if (!opportunity.source) {
    issues.push({ label: "Add source", tone: "neutral" });
  }
  if (
    opportunity.estimated_value === null ||
    opportunity.estimated_value === undefined
  ) {
    issues.push({ label: "Add estimate", tone: "neutral" });
  }
  if (!opportunity.next_follow_up_date) {
    issues.push({ label: "Add follow-up", tone: "warning" });
  } else if (isTodayOrPast(opportunity.next_follow_up_date)) {
    issues.push({ label: "Follow-up due", tone: "danger" });
  }
  if (issues.length === 0) {
    issues.push({ label: "Looks clean", tone: "success" });
  }
  return issues;
}

export function LeadsList({ leads, count, customers, profile, errorParam }: Props) {
  const customerById = new Map(customers.map((c) => [c.id, c]));

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
    <div className="space-y-5">
      <PageHeader
        eyebrow={profile.labels.leadPlural}
        title={`Manage ${profile.labels.leadPlural.toLowerCase()}`}
        description={`Create, review, and clean up ${profile.labels.leadPlural.toLowerCase()} before they become ${profile.labels.jobPlural.toLowerCase()} and ${profile.labels.salePlural.toLowerCase()}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/crm"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Pipeline view
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
              <p className="font-semibold text-slate-950">Quick add</p>
              <p className="mt-1 text-sm text-slate-500">
                Add a quote, request, estimate, deal, or potential job.
              </p>
            </div>
            <span className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white group-open:hidden">
              Add {profile.labels.leadSingular.toLowerCase()}
            </span>
            <span className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 group-open:inline-flex">
              Close
            </span>
          </summary>

          <form action={createLeadAction} className="border-t border-slate-100 p-5">
            {errorParam && <DismissError message={errorParam} />}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Link to person or business
                <select
                  name="customer_id"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">No linked {profile.labels.customerSingular.toLowerCase()} yet</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name ||
                        customer.email ||
                        customer.phone ||
                        "Unnamed person"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Status
                <select
                  name="status"
                  defaultValue="New"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
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
              <label className="text-sm font-medium text-slate-700">
                Opportunity name
                <input
                  name="service_requested"
                  required
                  placeholder="Website redesign, flooring quote, monthly service plan..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Estimated value
                <input
                  name="estimated_value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="2500"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Source
                <input
                  name="source"
                  placeholder="Referral, Google, Facebook, Website..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Next follow-up
                <input
                  name="next_follow_up_date"
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Notes
              <textarea
                name="notes"
                rows={3}
                placeholder="Add quote notes, next steps, or context..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Create {profile.labels.leadSingular.toLowerCase()}
              </button>
            </div>
          </form>
        </details>
      </SectionCard>

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
            <div className="divide-y divide-slate-100">
              {prioritizedOpenOpportunities.map((opportunity) => {
                const customer = opportunity.customer_id
                  ? customerById.get(opportunity.customer_id)
                  : null;
                const issues = getOpportunityIssues(opportunity);

                return (
                  <Link
                    key={opportunity.id}
                    href={`/leads/${opportunity.id}/edit`}
                    className="block p-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="grid gap-4 md:grid-cols-[1fr_135px_165px] md:items-start">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {opportunity.service_requested || "Untitled opportunity"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {customer?.name ||
                            opportunity.source ||
                            `No ${profile.labels.customerSingular.toLowerCase()} or source saved`}
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
                        <p className="text-xs font-medium text-slate-500">Next step</p>
                        <div className="mt-1">
                          <StatusBadge
                            tone={getFollowUpTone(opportunity.next_follow_up_date)}
                          >
                            {getFollowUpText(opportunity.next_follow_up_date)}
                          </StatusBadge>
                        </div>
                        <p className="mt-3 text-xs font-medium text-slate-500">Status</p>
                        <div className="mt-1">
                          <StatusBadge tone={getOpportunityTone(opportunity.status)}>
                            {opportunity.status || "Open"}
                          </StatusBadge>
                        </div>
                      </div>
                    </div>

                    {opportunity.notes && (
                      <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                        {opportunity.notes}
                      </p>
                    )}
                  </Link>
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
              <div className="divide-y divide-slate-100">
                {cleanupGroups.map((item) => (
                  <article
                    key={item.id}
                    className="flex items-start justify-between gap-4 p-4"
                  >
                    <div>
                      <StatusBadge tone="neutral">{item.label}</StatusBadge>
                      <p className="mt-2 font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
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
              <div className="divide-y divide-slate-100">
                {sourceGroups.map((group) => (
                  <article
                    key={group.source}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">{group.source}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {group.count} {profile.labels.leadPlural.toLowerCase()}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
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
          <div className="divide-y divide-slate-100">
            {recentlyClosed.map((opportunity) => (
              <Link
                key={opportunity.id}
                href={`/leads/${opportunity.id}/edit`}
                className="grid gap-3 p-4 transition-colors hover:bg-slate-50 md:grid-cols-[1fr_140px_120px] md:items-center"
              >
                <div>
                  <p className="font-semibold text-slate-950">
                    {opportunity.service_requested || "Untitled opportunity"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {opportunity.source || "No source saved"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-700">
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
