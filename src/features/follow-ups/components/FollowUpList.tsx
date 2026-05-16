import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { parseDateOnly, formatDateOnly, getTodayDateOnly } from "@/lib/date-format";
import { isClosedOpportunity, getGenericTone } from "@/lib/status";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { FollowUpRow, LeadRow, CustomerRow, FollowUpItem } from "../types";

type Props = {
  followUps: FollowUpRow[];
  opportunities: LeadRow[];
  people: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  filters: { status?: string; due?: string; source?: string };
  profile: IndustryProfile;
};

function isComplete(status: string | null) {
  const normalized = String(status || "").toLowerCase();
  return (
    normalized.includes("complete") ||
    normalized.includes("done") ||
    normalized.includes("closed")
  );
}

function isOverdue(date: string | null, status: string | null) {
  const target = parseDateOnly(date);
  if (!target || isComplete(status)) return false;
  return target < getTodayDateOnly();
}

function isDueToday(date: string | null, status: string | null) {
  const target = parseDateOnly(date);
  if (!target || isComplete(status)) return false;
  return target.getTime() === getTodayDateOnly().getTime();
}

function isUpcoming(date: string | null, status: string | null) {
  const target = parseDateOnly(date);
  if (!target || isComplete(status)) return false;
  return target > getTodayDateOnly();
}

function getDueTone(action: FollowUpItem) {
  if (isComplete(action.status)) return "success" as const;
  if (isOverdue(action.due_date, action.status)) return "danger" as const;
  if (isDueToday(action.due_date, action.status)) return "warning" as const;
  return "neutral" as const;
}

function getDueLabel(action: FollowUpItem) {
  if (isComplete(action.status)) return "Complete";
  if (!action.due_date) return "No due date";
  if (isOverdue(action.due_date, action.status)) return `Overdue ${formatDateOnly(action.due_date)}`;
  if (isDueToday(action.due_date, action.status)) return "Due today";
  return `Due ${formatDateOnly(action.due_date)}`;
}

function getActionNextStep(action: FollowUpItem) {
  if (!action.customer_id)
    return "Link this follow-up to the person or business it belongs to.";
  if (!action.title)
    return "Add a clear action so this follow-up is understandable.";
  if (!action.due_date && !isComplete(action.status))
    return "Add a due date so this follow-up can be prioritized.";
  if (isOverdue(action.due_date, action.status))
    return "This follow-up is overdue. Review it or mark it complete.";
  if (isDueToday(action.due_date, action.status))
    return "This follow-up is due today.";
  if (action.source_type === "opportunity")
    return "This follow-up comes from an open opportunity. Open it to update the pipeline record.";
  if (isComplete(action.status))
    return "This follow-up is complete.";
  return "Keep this follow-up updated as work moves forward.";
}

function getActionIssues(action: FollowUpItem) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
  }[] = [];

  if (!action.customer_id) issues.push({ label: "Link person", tone: "warning" });
  if (!action.title) issues.push({ label: "Add action", tone: "warning" });
  if (!action.due_date && !isComplete(action.status)) issues.push({ label: "Add due date", tone: "neutral" });
  if (isOverdue(action.due_date, action.status)) issues.push({ label: "Overdue", tone: "danger" });
  if (isDueToday(action.due_date, action.status)) issues.push({ label: "Due today", tone: "warning" });
  if (!action.status) issues.push({ label: "Add status", tone: "neutral" });
  if (action.source_type === "opportunity") issues.push({ label: "From opportunity", tone: "neutral" });
  if (issues.length === 0) issues.push({ label: "Looks clean", tone: "success" });

  return issues;
}

function getPriorityBucket(action: FollowUpItem) {
  if (isComplete(action.status)) return 5;
  if (isOverdue(action.due_date, action.status)) return 0;
  if (isDueToday(action.due_date, action.status)) return 1;
  if (isUpcoming(action.due_date, action.status)) return 2;
  if (!action.due_date) return 3;
  return 4;
}

function getSortDateTime(action: FollowUpItem) {
  const dueDate = parseDateOnly(action.due_date);
  if (dueDate) return dueDate.getTime();
  return new Date(action.created_at).getTime();
}

function buildFollowUpItems(
  followUps: FollowUpRow[],
  opportunities: LeadRow[],
): { manualItems: FollowUpItem[]; opportunityItems: FollowUpItem[] } {
  const manualItems: FollowUpItem[] = followUps.map((action) => ({
    id: `manual-${action.id}`,
    source_type: "manual",
    source_label: "Manual follow-up",
    customer_id: action.customer_id,
    title: action.message || "Untitled follow-up",
    due_date: action.due_date,
    status: action.status || "Open",
    created_at: action.created_at,
    href: `/follow-ups/${action.id}/edit`,
  }));

  const opportunityItems: FollowUpItem[] = opportunities
    .filter(
      (opp) => !isClosedOpportunity(opp.status) && Boolean(opp.next_follow_up_date),
    )
    .map((opp) => ({
      id: `opportunity-${opp.id}`,
      source_type: "opportunity",
      source_label: "Opportunity follow-up",
      customer_id: opp.customer_id,
      title: opp.service_requested
        ? `Follow up: ${opp.service_requested}`
        : "Follow up on opportunity",
      due_date: opp.next_follow_up_date,
      status: opp.status || "Open opportunity",
      created_at: opp.created_at,
      href: `/leads/${opp.id}/edit`,
    }));

  return { manualItems, opportunityItems };
}

export function FollowUpList({ followUps, opportunities, people, filters, profile }: Props) {
  const selectedStatus = filters.status ? decodeURIComponent(filters.status) : "";
  const selectedDue = filters.due ? decodeURIComponent(filters.due) : "";
  const selectedSource = filters.source ? decodeURIComponent(filters.source) : "";

  const { manualItems, opportunityItems } = buildFollowUpItems(followUps, opportunities);
  const actions = [...manualItems, ...opportunityItems];

  const openActions = actions.filter((a) => !isComplete(a.status));
  const overdueActions = actions.filter((a) => isOverdue(a.due_date, a.status));
  const dueTodayActions = actions.filter((a) => isDueToday(a.due_date, a.status));
  const upcomingActions = actions.filter((a) => isUpcoming(a.due_date, a.status));
  const missingDueDate = actions.filter((a) => !a.due_date && !isComplete(a.status));
  const missingStatus = actions.filter((a) => !a.status);
  const missingPerson = actions.filter((a) => !a.customer_id);

  const personById = new Map(people.map((p) => [p.id, p]));

  const cleanupGroups = [
    {
      id: "missing-person",
      label: "Link person",
      title: "Follow-ups need people or businesses",
      detail: "Follow-ups are more useful when they are connected to who they are for.",
      count: missingPerson.length,
      href: "/follow-ups",
    },
    {
      id: "missing-due-date",
      label: "Add due date",
      title: "Follow-ups need due dates",
      detail: "Due dates help prioritize what needs attention first.",
      count: missingDueDate.length,
      href: "/follow-ups",
    },
    {
      id: "missing-status",
      label: "Add status",
      title: "Follow-ups need statuses",
      detail: "Statuses make it clear what is still open and what is complete.",
      count: missingStatus.length,
      href: "/follow-ups",
    },
  ].filter((item) => item.count > 0);

  const prioritizedActions = [...actions]
    .sort((a, b) => {
      const aBucket = getPriorityBucket(a);
      const bBucket = getPriorityBucket(b);
      if (aBucket !== bBucket) return aBucket - bBucket;
      const aDate = getSortDateTime(a);
      const bDate = getSortDateTime(b);
      if (aDate !== bDate) return aDate - bDate;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })
    .slice(0, 25);

  const visibleActions = prioritizedActions.filter((action) => {
    if (selectedStatus && (action.status || "Not set") !== selectedStatus) return false;
    if (selectedSource && action.source_type !== selectedSource) return false;
    if (selectedDue === "overdue") return isOverdue(action.due_date, action.status);
    if (selectedDue === "today") return isDueToday(action.due_date, action.status);
    if (selectedDue === "upcoming") return isUpcoming(action.due_date, action.status);
    if (selectedDue === "missing") return !action.due_date && !isComplete(action.status);
    return true;
  });

  const dueGroups = [
    {
      id: "overdue",
      label: "Overdue",
      description: "Past-due follow-ups that are still open.",
      count: overdueActions.length,
      tone: "danger" as const,
    },
    {
      id: "today",
      label: "Due today",
      description: "Follow-ups due today.",
      count: dueTodayActions.length,
      tone: "warning" as const,
    },
    {
      id: "upcoming",
      label: "Upcoming",
      description: "Open follow-ups with future due dates, sorted soonest first.",
      count: upcomingActions.length,
      tone: "neutral" as const,
    },
    {
      id: "missing",
      label: "No due date",
      description: "Open follow-ups that need a due date.",
      count: missingDueDate.length,
      tone: "neutral" as const,
    },
  ].filter((group) => group.count > 0);

  const sourceGroups = [
    {
      id: "manual",
      label: "Manual follow-ups",
      description: "Follow-ups created directly on this page.",
      count: manualItems.length,
      href: selectedSource === "manual" ? "/follow-ups" : "/follow-ups?source=manual",
    },
    {
      id: "opportunity",
      label: "Opportunity follow-ups",
      description: "Follow-up dates coming from open opportunities.",
      count: opportunityItems.length,
      href: selectedSource === "opportunity" ? "/follow-ups" : "/follow-ups?source=opportunity",
    },
  ].filter((group) => group.count > 0);

  return (
    <>
      <PageHeader
        eyebrow={profile.labels.followUpPlural}
        title={`${openActions.length} open ${profile.labels.followUpPlural.toLowerCase()}`}
        description={`Manual reminders, ${profile.labels.leadSingular.toLowerCase()} follow-ups, and overdue items — all in one view.`}
        actions={
          <div className="flex gap-2">
            <Link href="/crm" className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk">
              Pipeline
            </Link>
          </div>
        }
      />
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open follow-ups"
          value={openActions.length}
          helper={`${manualItems.length} manual · ${opportunityItems.length} from opportunities`}
          tone={openActions.length > 0 ? "warning" : "positive"}
        />
        <StatCard
          label="Overdue"
          value={overdueActions.length}
          helper="Past due and not complete"
          tone={overdueActions.length > 0 ? "danger" : "positive"}
        />
        <StatCard
          label="Due today"
          value={dueTodayActions.length}
          helper="Needs attention today"
          tone={dueTodayActions.length > 0 ? "warning" : "positive"}
        />
        <StatCard
          label="Upcoming"
          value={upcomingActions.length}
          helper="Future follow-ups, soonest first"
          tone={upcomingActions.length > 0 ? "default" : "positive"}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr] items-start">
        <SectionCard
          title={
            selectedDue
              ? `${selectedDue} follow-ups`
              : selectedSource
                ? `${selectedSource} follow-ups`
                : "Follow-up queue"
          }
          description={
            selectedDue
              ? "Showing follow-ups filtered by timing."
              : selectedSource
                ? "Showing follow-ups filtered by source."
                : "Sorted by overdue, due today, then the nearest upcoming date."
          }
        >
          {visibleActions.length === 0 ? (
            <EmptyState
              title="No follow-ups found"
              description="Add a manual follow-up or set a next follow-up date on an opportunity."
            />
          ) : (
            <>
              {(selectedDue || selectedSource) && (
                <div className="flex items-center justify-between gap-3 border-b border-ud p-4">
                  <p className="text-sm font-semibold text-ud-muted">
                    Filtered by: {selectedDue || selectedSource}
                  </p>
                  <Link
                    href="/follow-ups"
                    className="rounded-xl border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-ud-surface-sunk"
                  >
                    Clear filter
                  </Link>
                </div>
              )}

              <div className="divide-y divide-ud">
                {visibleActions.map((action) => {
                  const issues = getActionIssues(action);
                  const person = action.customer_id
                    ? personById.get(action.customer_id)
                    : null;

                  return (
                    <Link key={action.id} href={action.href} className="block p-4 transition-colors hover:bg-ud-surface-sunk">
                      <div className="grid gap-4 md:grid-cols-[1fr_150px_120px] md:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone="neutral">{action.source_label}</StatusBadge>
                          </div>
                          <p className="mt-3 font-semibold text-ud-ink">{action.title}</p>
                          <p className="mt-1 text-sm text-ud-faint">
                            {person?.name || "No person linked"}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-ud-muted">
                            {getActionNextStep(action)}
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
                          <p className="text-xs font-medium text-ud-faint">Due</p>
                          <div className="mt-1">
                            <StatusBadge tone={getDueTone(action)}>{getDueLabel(action)}</StatusBadge>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-ud-faint">Status</p>
                          <div className="mt-1">
                            <StatusBadge tone={getGenericTone(action.status)}>
                              {action.status || "Not set"}
                            </StatusBadge>
                          </div>
                          <p className="mt-3 text-xs font-medium text-ud-faint">Added</p>
                          <p className="mt-1 text-sm font-semibold text-ud-muted">
                            {formatDateOnly(action.created_at)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard
            title="Follow-up source"
            description="Where follow-ups are coming from."
          >
            {sourceGroups.length === 0 ? (
              <EmptyState
                title="No follow-up sources yet"
                description="Manual and opportunity follow-ups will appear here."
              />
            ) : (
              <div className="divide-y divide-ud">
                {sourceGroups.map((group) => (
                  <article
                    key={group.id}
                    className="grid gap-3 p-4 md:grid-cols-[1fr_90px] md:items-center"
                  >
                    <div>
                      <p className="font-semibold text-ud-ink">{group.label}</p>
                      <p className="mt-1 text-sm leading-6 text-ud-faint">{group.description}</p>
                      <p className="mt-2 text-sm font-semibold text-ud-muted">{group.count} follow-ups</p>
                    </div>
                    <div className="md:text-right">
                      <Link
                        href={group.href}
                        className="inline-flex rounded-xl border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-ud-surface-sunk"
                      >
                        {selectedSource === group.id ? "Clear" : "Review"}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Due timing"
            description="Use this to filter follow-ups by urgency."
          >
            {dueGroups.length === 0 ? (
              <EmptyState
                title="No open timing issues"
                description="No overdue, due today, upcoming, or missing-date follow-ups were found."
              />
            ) : (
              <div className="divide-y divide-ud">
                {dueGroups.map((group) => (
                  <article
                    key={group.id}
                    className="grid gap-3 p-4 md:grid-cols-[1fr_90px] md:items-center"
                  >
                    <div>
                      <StatusBadge tone={group.tone}>{group.label}</StatusBadge>
                      <p className="mt-2 font-semibold text-ud-ink">{group.count} follow-ups</p>
                      <p className="mt-1 text-sm leading-6 text-ud-faint">{group.description}</p>
                    </div>
                    <div className="md:text-right">
                      <Link
                        href={
                          selectedDue === group.id
                            ? "/follow-ups"
                            : `/follow-ups?due=${encodeURIComponent(group.id)}`
                        }
                        className="inline-flex rounded-xl border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-ud-surface-sunk"
                      >
                        {selectedDue === group.id ? "Clear" : "Review"}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </section>

      <SectionCard
        title="Follow-up health"
        description="Cleanup issues that make follow-up tracking less reliable."
      >
        {cleanupGroups.length === 0 ? (
          <EmptyState
            title="Follow-ups look clean"
            description="No missing person, due date, or status issues were found."
          />
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-3">
            {cleanupGroups.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4 hover:bg-ud-surface"
              >
                <div className="flex items-start justify-between gap-3">
                  <StatusBadge tone="neutral">{item.label}</StatusBadge>
                  <span className="rounded-full bg-ud-surface-sunk px-3 py-1 text-xs font-semibold text-ud-muted">
                    {item.count}
                  </span>
                </div>
                <p className="mt-3 font-semibold text-ud-ink">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-ud-faint">{item.detail}</p>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
