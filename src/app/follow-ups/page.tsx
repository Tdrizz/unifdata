import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DismissError } from "@/components/ui/DismissError";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import {
  parseDateOnly,
  formatDateOnly,
  isOverdue as isDateOverdue,
  isDueToday as isDateDueToday,
  isUpcoming as isDateUpcoming,
} from "@/lib/date-format";
import { getFormString } from "@/lib/utils";
import { isClosedOpportunity, isOpenFollowUp, getGenericTone } from "@/lib/status";
import { getIndustryProfile } from "@/lib/industry-profiles";

type ManualFollowUpRecord = {
  id: string;
  customer_id: string | null;
  message: string | null;
  due_date: string | null;
  status: string | null;
  created_at: string;
};

type OpportunityRecord = {
  id: string;
  customer_id: string | null;
  service_requested: string | null;
  status: string | null;
  next_follow_up_date: string | null;
  source: string | null;
  estimated_value: number | null;
  created_at: string;
};

type PersonRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

type FollowUpItem = {
  id: string;
  source_type: "manual" | "opportunity";
  source_label: string;
  customer_id: string | null;
  title: string;
  due_date: string | null;
  status: string | null;
  created_at: string;
  href: string;
};

function isComplete(status: string | null) {
  return !isOpenFollowUp(status);
}

function isOverdue(date: string | null, status: string | null) {
  return !isComplete(status) && isDateOverdue(date);
}

function isDueToday(date: string | null, status: string | null) {
  return !isComplete(status) && isDateDueToday(date);
}

function isUpcoming(date: string | null, status: string | null) {
  return !isComplete(status) && isDateUpcoming(date);
}

function getDueTone(action: FollowUpItem) {
  if (isComplete(action.status)) {
    return "success" as const;
  }

  if (isOverdue(action.due_date, action.status)) {
    return "danger" as const;
  }

  if (isDueToday(action.due_date, action.status)) {
    return "warning" as const;
  }

  return "neutral" as const;
}

function getDueLabel(action: FollowUpItem) {
  if (isComplete(action.status)) {
    return "Complete";
  }

  if (!action.due_date) {
    return "No due date";
  }

  if (isOverdue(action.due_date, action.status)) {
    return `Overdue ${formatDateOnly(action.due_date)}`;
  }

  if (isDueToday(action.due_date, action.status)) {
    return "Due today";
  }

  return `Due ${formatDateOnly(action.due_date)}`;
}

function getActionNextStep(action: FollowUpItem) {
  if (!action.customer_id) {
    return "Link this follow-up to the person or business it belongs to.";
  }

  if (!action.title) {
    return "Add a clear action so this follow-up is understandable.";
  }

  if (!action.due_date && !isComplete(action.status)) {
    return "Add a due date so this follow-up can be prioritized.";
  }

  if (isOverdue(action.due_date, action.status)) {
    return "This follow-up is overdue. Review it or mark it complete.";
  }

  if (isDueToday(action.due_date, action.status)) {
    return "This follow-up is due today.";
  }

  if (action.source_type === "opportunity") {
    return "This follow-up comes from an open opportunity. Open it to update the pipeline record.";
  }

  if (isComplete(action.status)) {
    return "This follow-up is complete.";
  }

  return "Keep this follow-up updated as work moves forward.";
}

function getActionIssues(action: FollowUpItem) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
  }[] = [];

  if (!action.customer_id) {
    issues.push({
      label: "Link person",
      tone: "warning",
    });
  }

  if (!action.title) {
    issues.push({
      label: "Add action",
      tone: "warning",
    });
  }

  if (!action.due_date && !isComplete(action.status)) {
    issues.push({
      label: "Add due date",
      tone: "neutral",
    });
  }

  if (isOverdue(action.due_date, action.status)) {
    issues.push({
      label: "Overdue",
      tone: "danger",
    });
  }

  if (isDueToday(action.due_date, action.status)) {
    issues.push({
      label: "Due today",
      tone: "warning",
    });
  }

  if (!action.status) {
    issues.push({
      label: "Add status",
      tone: "neutral",
    });
  }

  if (action.source_type === "opportunity") {
    issues.push({
      label: "From opportunity",
      tone: "neutral",
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

function getPriorityBucket(action: FollowUpItem) {
  if (isComplete(action.status)) {
    return 5;
  }

  if (isOverdue(action.due_date, action.status)) {
    return 0;
  }

  if (isDueToday(action.due_date, action.status)) {
    return 1;
  }

  if (isUpcoming(action.due_date, action.status)) {
    return 2;
  }

  if (!action.due_date) {
    return 3;
  }

  return 4;
}

function getSortDateTime(action: FollowUpItem) {
  const dueDate = parseDateOnly(action.due_date);

  if (dueDate) {
    return dueDate.getTime();
  }

  return new Date(action.created_at).getTime();
}

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; due?: string; source?: string; error?: string; q?: string }>;
}) {
  const params = await searchParams;
  const selectedStatus = params.status ? decodeURIComponent(params.status) : "";
  const selectedDue = params.due ? decodeURIComponent(params.due) : "";
  const selectedSource = params.source ? decodeURIComponent(params.source) : "";
  const errorParam = params.error ? decodeURIComponent(params.error) : "";
  const rawQ = params.q ? decodeURIComponent(params.q).trim() : "";
  const q = rawQ.toLowerCase();

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

  async function createFollowUp(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const currentCompany = await getCurrentCompany();

    if (!currentCompany) {
      redirect("/onboarding");
    }

    const { company } = currentCompany;

    const customerId = getFormString(formData, "customer_id");
    const message = getFormString(formData, "message");
    const dueDate = getFormString(formData, "due_date");
    const status = getFormString(formData, "status") || "Open";

    if (!message) {
      redirect("/follow-ups?error=Follow-up+action+is+required.");
    }

    const { error } = await supabase.from("follow_ups").insert({
      company_id: company.id,
      customer_id: customerId || null,
      message,
      due_date: dueDate || null,
      status,
    });

    if (error) {
      redirect(`/follow-ups?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/follow-ups");
    revalidatePath("/workspace");
    redirect("/follow-ups");
  }

  // When searching, pre-fetch matching customer IDs so name search hits the DB
  let searchCustomerIds: string[] = [];
  if (q) {
    const { data: matchingCustomers } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", company.id)
      .ilike("name", `%${q}%`)
      .limit(500);
    searchCustomerIds = (matchingCustomers || []).map((c) => c.id);
  }

  const followUpsFilter = q
    ? [
        `message.ilike.%${q}%`,
        ...(searchCustomerIds.length > 0
          ? [`customer_id.in.(${searchCustomerIds.join(",")})`]
          : []),
      ].join(",")
    : null;

  const [followUpsResult, opportunitiesResult, peopleResult] =
    await Promise.all([
      followUpsFilter
        ? supabase
            .from("follow_ups")
            .select("id, customer_id, message, due_date, status, created_at")
            .eq("company_id", company.id)
            .or(followUpsFilter)
            .order("created_at", { ascending: false })
            .limit(1000)
        : supabase
            .from("follow_ups")
            .select("id, customer_id, message, due_date, status, created_at")
            .eq("company_id", company.id)
            .order("created_at", { ascending: false })
            .limit(250),

      supabase
        .from("leads")
        .select(
          "id, customer_id, service_requested, status, next_follow_up_date, source, estimated_value, created_at",
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

  if (followUpsResult.error) {
    throw new Error(followUpsResult.error.message);
  }

  if (opportunitiesResult.error) {
    throw new Error(opportunitiesResult.error.message);
  }

  if (peopleResult.error) {
    throw new Error(peopleResult.error.message);
  }

  const manualFollowUps = (followUpsResult.data ||
    []) as ManualFollowUpRecord[];
  const opportunities = (opportunitiesResult.data || []) as OpportunityRecord[];
  const people = (peopleResult.data || []) as PersonRecord[];

  const personById = new Map(people.map((person) => [person.id, person]));

  const manualItems: FollowUpItem[] = manualFollowUps.map((action) => ({
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
      (opportunity) =>
        !isClosedOpportunity(opportunity.status) &&
        Boolean(opportunity.next_follow_up_date),
    )
    .map((opportunity) => ({
      id: `opportunity-${opportunity.id}`,
      source_type: "opportunity",
      source_label: "Opportunity follow-up",
      customer_id: opportunity.customer_id,
      title: opportunity.service_requested
        ? `Follow up: ${opportunity.service_requested}`
        : "Follow up on opportunity",
      due_date: opportunity.next_follow_up_date,
      status: opportunity.status || "Open opportunity",
      created_at: opportunity.created_at,
      href: `/leads/${opportunity.id}/edit`,
    }));

  // manualItems already filtered by DB; filter opportunityItems in-memory
  const filteredOpportunityItems = q
    ? opportunityItems.filter((action) => {
        const person = action.customer_id ? personById.get(action.customer_id) : null;
        return (
          action.title.toLowerCase().includes(q) ||
          (person?.name ?? "").toLowerCase().includes(q)
        );
      })
    : opportunityItems;

  const allActions = [...manualItems, ...filteredOpportunityItems];
  const actions = allActions;

  const openActions = allActions.filter((action) => !isComplete(action.status));
  const overdueActions = allActions.filter((action) =>
    isOverdue(action.due_date, action.status),
  );
  const dueTodayActions = allActions.filter((action) =>
    isDueToday(action.due_date, action.status),
  );
  const upcomingActions = allActions.filter((action) =>
    isUpcoming(action.due_date, action.status),
  );
  const missingDueDate = allActions.filter(
    (action) => !action.due_date && !isComplete(action.status),
  );
  const missingStatus = allActions.filter((action) => !action.status);
  const missingPerson = allActions.filter((action) => !action.customer_id);

  const cleanupGroups = [
    {
      id: "missing-person",
      label: "Link person",
      title: "Follow-ups need people or businesses",
      detail:
        "Follow-ups are more useful when they are connected to who they are for.",
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

      if (aBucket !== bBucket) {
        return aBucket - bBucket;
      }

      const aDate = getSortDateTime(a);
      const bDate = getSortDateTime(b);

      if (aDate !== bDate) {
        return aDate - bDate;
      }

      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    })
    .slice(0, 25);

  const visibleActions = prioritizedActions.filter((action) => {
    if (selectedStatus && (action.status || "Not set") !== selectedStatus) {
      return false;
    }

    if (selectedSource && action.source_type !== selectedSource) {
      return false;
    }

    if (selectedDue === "overdue") {
      return isOverdue(action.due_date, action.status);
    }

    if (selectedDue === "today") {
      return isDueToday(action.due_date, action.status);
    }

    if (selectedDue === "upcoming") {
      return isUpcoming(action.due_date, action.status);
    }

    if (selectedDue === "missing") {
      return !action.due_date && !isComplete(action.status);
    }

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
      description:
        "Open follow-ups with future due dates, sorted soonest first.",
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
      href:
        selectedSource === "manual"
          ? "/follow-ups"
          : "/follow-ups?source=manual",
    },
    {
      id: "opportunity",
      label: "Opportunity follow-ups",
      description: "Follow-up dates coming from open opportunities.",
      count: opportunityItems.length,
      href:
        selectedSource === "opportunity"
          ? "/follow-ups"
          : "/follow-ups?source=opportunity",
    },
  ].filter((group) => group.count > 0);

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
          eyebrow={profile.labels.followUpPlural}
          title="Priority follow-up queue"
          description={`Manual follow-ups and ${profile.labels.leadSingular.toLowerCase()} follow-up dates are sorted by urgency and due date.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/leads"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Opportunities
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
            label="Open follow-ups"
            value={openActions.length}
            helper={`${manualItems.length} manual Â· ${opportunityItems.length} from opportunities`}
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

        <SectionCard
          title="Add manual follow-up"
          description="Create a reminder, callback, task, or next step and optionally connect it to a person."
        >
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold text-slate-950">Quick add</p>
                <p className="mt-1 text-sm text-slate-500">
                  Opportunity follow-up dates appear automatically from the
                  Opportunities page.
                </p>
              </div>

              <span className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white group-open:hidden">
                Add follow-up
              </span>

              <span className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 group-open:inline-flex">
                Close
              </span>
            </summary>

            <form
              action={createFollowUp}
              className="border-t border-slate-100 p-5"
            >
              {errorParam && <DismissError message={errorParam} />}

              <label className="block text-sm font-medium text-slate-700">
                Link to person or business
                <select
                  name="customer_id"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">No linked person yet</option>
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

              <label className="mt-4 block text-sm font-medium text-slate-700">
                Follow-up action
                <input
                  name="message"
                  required
                  placeholder="Call customer, send quote, check payment, schedule job..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Due date
                  <input
                    name="due_date"
                    type="date"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Status
                  <select
                    name="status"
                    defaultValue="Open"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Complete">Complete</option>
                  </select>
                </label>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Create follow-up
                </button>
              </div>
            </form>
          </details>
        </SectionCard>

        {allActions.length >= 250 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Showing the 250 most recent follow-ups — older records may not appear. Use search to find specific entries.
          </div>
        )}

        <div className="mb-1">
          <SearchInput placeholder="Search follow-ups..." />
        </div>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr] items-start">
          <SectionCard
            title={
              q
                ? `Results for "${rawQ}"`
                : selectedDue
                  ? `${selectedDue} follow-ups`
                  : selectedSource
                    ? `${selectedSource} follow-ups`
                    : "Follow-up queue"
            }
            description={
              q
                ? `${visibleActions.length} of ${allActions.length} follow-ups match`
                : selectedDue
                  ? "Showing follow-ups filtered by timing."
                  : selectedSource
                    ? "Showing follow-ups filtered by source."
                    : "Sorted by overdue, due today, then the nearest upcoming date."
            }
          >
            {visibleActions.length === 0 ? (
              <EmptyState
                title={q ? `No follow-ups match "${rawQ}"` : "No follow-ups found"}
                description={q ? "Try a different search term." : "Add a manual follow-up or set a next follow-up date on an opportunity."}
              />
            ) : (
              <>
                {(selectedDue || selectedSource) && (
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Filtered by: {selectedDue || selectedSource}
                    </p>

                    <Link
                      href="/follow-ups"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Clear filter
                    </Link>
                  </div>
                )}

                <div className="divide-y divide-slate-100">
                  {visibleActions.map((action) => {
                    const issues = getActionIssues(action);
                    const person = action.customer_id
                      ? personById.get(action.customer_id)
                      : null;

                    return (
                      <Link key={action.id} href={action.href} className="block p-4 transition-colors hover:bg-slate-50">
                        <div className="grid gap-4 md:grid-cols-[1fr_150px_120px] md:items-start">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge tone="neutral">
                                {action.source_label}
                              </StatusBadge>
                            </div>

                            <p className="mt-3 font-semibold text-slate-950">
                              {action.title}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {person?.name || "No person linked"}
                            </p>

                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {getActionNextStep(action)}
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
                              Due
                            </p>
                            <div className="mt-1">
                              <StatusBadge tone={getDueTone(action)}>
                                {getDueLabel(action)}
                              </StatusBadge>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-500">
                              Status
                            </p>
                            <div className="mt-1">
                              <StatusBadge tone={getGenericTone(action.status)}>
                                {action.status || "Not set"}
                              </StatusBadge>
                            </div>

                            <p className="mt-3 text-xs font-medium text-slate-500">
                              Added
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
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
                <div className="divide-y divide-slate-100">
                  {sourceGroups.map((group) => (
                    <article
                      key={group.id}
                      className="grid gap-3 p-4 md:grid-cols-[1fr_90px] md:items-center"
                    >
                      <div>
                        <p className="font-semibold text-slate-950">
                          {group.label}
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {group.description}
                        </p>

                        <p className="mt-2 text-sm font-semibold text-slate-700">
                          {group.count} follow-ups
                        </p>
                      </div>

                      <div className="md:text-right">
                        <Link
                          href={group.href}
                          className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
                <div className="divide-y divide-slate-100">
                  {dueGroups.map((group) => (
                    <article
                      key={group.id}
                      className="grid gap-3 p-4 md:grid-cols-[1fr_90px] md:items-center"
                    >
                      <div>
                        <StatusBadge tone={group.tone}>
                          {group.label}
                        </StatusBadge>

                        <p className="mt-2 font-semibold text-slate-950">
                          {group.count} follow-ups
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {group.description}
                        </p>
                      </div>

                      <div className="md:text-right">
                        <Link
                          href={
                            selectedDue === group.id
                              ? "/follow-ups"
                              : `/follow-ups?due=${encodeURIComponent(
                                  group.id,
                                )}`
                          }
                          className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <StatusBadge tone="neutral">{item.label}</StatusBadge>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {item.count}
                    </span>
                  </div>

                  <p className="mt-3 font-semibold text-slate-950">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {item.detail}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}

