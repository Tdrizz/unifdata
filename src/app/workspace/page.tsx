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
import { formatDateOnly, parseDateOnly } from "@/lib/date-format";

type CustomerRecord = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  customer_type: string | null;
  created_at: string;
};

type LeadRecord = {
  id: string;
  customer_id: string | null;
  service_requested: string | null;
  status: string | null;
  estimated_value: number | null;
  source: string | null;
  next_follow_up_date: string | null;
  created_at: string;
};

type WorkRecord = {
  id: string;
  customer_id: string | null;
  lead_id: string | null;
  service_type: string | null;
  status: string | null;
  job_value: number | null;
  start_date: string | null;
  completed_date: string | null;
  paid_status: string | null;
  created_at: string;
};

type RevenueRecord = {
  id: string;
  amount: number | null;
  payment_status: string | null;
  sale_date: string | null;
  service_type: string | null;
  source: string | null;
  created_at: string;
};

type FollowUpRecord = {
  id: string;
  customer_id: string | null;
  message: string | null;
  due_date: string | null;
  status: string | null;
  created_at: string;
};

type QueueItem = {
  id: string;
  label: string;
  title: string;
  detail: string;
  href: string;
  tone: "success" | "warning" | "danger" | "neutral";
  due_date?: string | null;
  priority: number;
};

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatTimestampDate(date: string | null | undefined) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString();
}

function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isTodayOrPast(date: string | null) {
  const value = parseDateOnly(date);

  if (!value) {
    return false;
  }

  return value <= getToday();
}

function isOverdue(date: string | null) {
  const value = parseDateOnly(date);

  if (!value) {
    return false;
  }

  return value < getToday();
}

function isDueToday(date: string | null) {
  const value = parseDateOnly(date);

  if (!value) {
    return false;
  }

  return value.getTime() === getToday().getTime();
}

function getSortDate(date: string | null | undefined, fallback: string) {
  const parsed = parseDateOnly(date || null);

  if (parsed) {
    return parsed.getTime();
  }

  return new Date(fallback).getTime();
}

function isClosedOpportunity(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  return (
    normalized.includes("won") ||
    normalized.includes("lost") ||
    normalized.includes("cancel") ||
    normalized.includes("declined")
  );
}

function isCompleteWork(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  return (
    normalized.includes("complete") ||
    normalized.includes("done") ||
    normalized.includes("finished")
  );
}

function isCancelledWork(status: string | null) {
  const normalized = String(status || "").toLowerCase();
  return normalized.includes("cancel");
}

function isUnpaid(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  return (
    normalized.includes("unpaid") ||
    normalized.includes("partial") ||
    normalized.includes("due") ||
    normalized.includes("overdue")
  );
}

function isCompleteFollowUp(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  return (
    normalized.includes("complete") ||
    normalized.includes("done") ||
    normalized.includes("closed")
  );
}

function getStatusTone(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (
    normalized.includes("complete") ||
    normalized.includes("done") ||
    normalized.includes("paid") ||
    normalized.includes("won")
  ) {
    return "success" as const;
  }

  if (
    normalized.includes("lost") ||
    normalized.includes("cancel") ||
    normalized.includes("failed") ||
    normalized.includes("overdue") ||
    normalized.includes("unpaid") ||
    normalized.includes("partial")
  ) {
    return "danger" as const;
  }

  if (
    normalized.includes("new") ||
    normalized.includes("open") ||
    normalized.includes("pending") ||
    normalized.includes("follow") ||
    normalized.includes("estimate") ||
    normalized.includes("active") ||
    normalized.includes("progress") ||
    normalized.includes("scheduled")
  ) {
    return "warning" as const;
  }

  return "neutral" as const;
}

function getFollowUpLabel(date: string | null) {
  if (!date) {
    return "No due date";
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
    return "neutral" as const;
  }

  if (isOverdue(date)) {
    return "danger" as const;
  }

  if (isDueToday(date)) {
    return "warning" as const;
  }

  return "neutral" as const;
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

  const [
    customersResult,
    leadsResult,
    workResult,
    revenueResult,
    followUpsResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, email, address, customer_type, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(250),

    supabase
      .from("leads")
      .select(
        "id, customer_id, service_requested, status, estimated_value, source, next_follow_up_date, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(250),

    supabase
      .from("jobs")
      .select(
        "id, customer_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(250),

    supabase
      .from("sales")
      .select(
        "id, amount, payment_status, sale_date, service_type, source, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(250),

    supabase
      .from("follow_ups")
      .select("id, customer_id, message, due_date, status, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  if (customersResult.error) {
    throw new Error(customersResult.error.message);
  }

  if (leadsResult.error) {
    throw new Error(leadsResult.error.message);
  }

  if (workResult.error) {
    throw new Error(workResult.error.message);
  }

  if (revenueResult.error) {
    throw new Error(revenueResult.error.message);
  }

  if (followUpsResult.error) {
    throw new Error(followUpsResult.error.message);
  }

  const customers = (customersResult.data || []) as CustomerRecord[];
  const leads = (leadsResult.data || []) as LeadRecord[];
  const workRecords = (workResult.data || []) as WorkRecord[];
  const revenueRecords = (revenueResult.data || []) as RevenueRecord[];
  const followUps = (followUpsResult.data || []) as FollowUpRecord[];

  const customerById = new Map(
    customers.map((customer) => [customer.id, customer]),
  );

  const openLeads = leads.filter((lead) => !isClosedOpportunity(lead.status));
  const activeWork = workRecords.filter(
    (work) => !isCompleteWork(work.status) && !isCancelledWork(work.status),
  );

  const unpaidRevenue = revenueRecords.filter((record) =>
    isUnpaid(record.payment_status),
  );

  const openPipelineValue = openLeads.reduce(
    (sum, lead) => sum + Number(lead.estimated_value || 0),
    0,
  );
const activeWorkValue = activeWork.reduce(
    (sum, work) => sum + Number(work.job_value || 0),
    0,
  );

  const unpaidRevenueValue = unpaidRevenue.reduce(
    (sum, record) => sum + Number(record.amount || 0),
    0,
  );

  const manualFollowUpItems: QueueItem[] = followUps
    .filter((action) => !isCompleteFollowUp(action.status))
    .map((action) => ({
      id: `manual-follow-up-${action.id}`,
      label: "Manual follow-up",
      title: action.message || "Follow up",
      detail: getFollowUpLabel(action.due_date),
      href: `/follow-ups/${action.id}/edit`,
      tone: getFollowUpTone(action.due_date),
      due_date: action.due_date,
      priority: isOverdue(action.due_date)
        ? 0
        : isDueToday(action.due_date)
          ? 1
          : action.due_date
            ? 2
            : 4,
    }));

  const opportunityFollowUpItems: QueueItem[] = openLeads
    .filter((lead) => Boolean(lead.next_follow_up_date))
    .map((lead) => ({
      id: `opportunity-follow-up-${lead.id}`,
      label: "Opportunity follow-up",
      title: lead.service_requested || "Follow up on opportunity",
      detail: getFollowUpLabel(lead.next_follow_up_date),
      href: `/leads/${lead.id}/edit`,
      tone: getFollowUpTone(lead.next_follow_up_date),
      due_date: lead.next_follow_up_date,
      priority: isOverdue(lead.next_follow_up_date)
        ? 0
        : isDueToday(lead.next_follow_up_date)
          ? 1
          : lead.next_follow_up_date
            ? 2
            : 4,
    }));

  const paymentAttentionItems: QueueItem[] = unpaidRevenue.map((record) => ({
    id: `payment-${record.id}`,
    label: "Payment needed",
    title: record.service_type || formatCurrency(record.amount),
    detail: `${formatCurrency(record.amount)} marked ${
      record.payment_status || "unpaid"
    }`,
    href: `/sales/${record.id}/edit`,
    tone: "danger",
    priority: 1,
  }));

  const cleanupItems: QueueItem[] = [
    ...customers
      .filter((customer) => !customer.phone || !customer.email)
      .slice(0, 3)
      .map((customer) => ({
        id: `customer-contact-${customer.id}`,
        label: "Add contact",
        title: customer.name || "Person needs contact",
        detail: "Phone or email is missing.",
        href: `/customers/${customer.id}/edit`,
        tone: "neutral" as const,
        priority: 5,
      })),

    ...customers
      .filter((customer) => !customer.address)
      .slice(0, 3)
      .map((customer) => ({
        id: `customer-address-${customer.id}`,
        label: "Add address",
        title: customer.name || "Person needs address",
        detail: "No address saved.",
        href: `/customers/${customer.id}/edit`,
        tone: "neutral" as const,
        priority: 5,
      })),

    ...openLeads
      .filter((lead) => !lead.source)
      .slice(0, 3)
      .map((lead) => ({
        id: `lead-source-${lead.id}`,
        label: "Add source",
        title: lead.service_requested || "Opportunity needs source",
        detail: "Source helps show what marketing is working.",
        href: `/leads/${lead.id}/edit`,
        tone: "neutral" as const,
        priority: 5,
      })),

    ...openLeads
      .filter(
        (lead) =>
          lead.estimated_value === null || lead.estimated_value === undefined,
      )
      .slice(0, 3)
      .map((lead) => ({
        id: `lead-value-${lead.id}`,
        label: "Add estimate",
        title: lead.service_requested || "Opportunity needs estimate",
        detail: "Estimated value helps prioritize the pipeline.",
        href: `/leads/${lead.id}/edit`,
        tone: "neutral" as const,
        priority: 5,
      })),

    ...workRecords
      .filter((work) => work.job_value === null || work.job_value === undefined)
      .slice(0, 3)
      .map((work) => ({
        id: `work-value-${work.id}`,
        label: "Add work value",
        title: work.service_type || "Work needs value",
        detail: "Work value keeps operational reporting accurate.",
        href: `/jobs/${work.id}/edit`,
        tone: "neutral" as const,
        priority: 5,
      })),
  ];

  const priorityQueue = [
    ...manualFollowUpItems,
    ...opportunityFollowUpItems,
    ...paymentAttentionItems,
    ...cleanupItems,
  ]
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      return getSortDate(a.due_date, "") - getSortDate(b.due_date, "");
    })
    .slice(0, 8);

  const followUpSchedule = [...manualFollowUpItems, ...opportunityFollowUpItems]
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      return getSortDate(a.due_date, "") - getSortDate(b.due_date, "");
    })
    .slice(0, 5);

  const opportunitiesNeedingFollowUp = openLeads.filter(
    (lead) =>
      !lead.next_follow_up_date || isTodayOrPast(lead.next_follow_up_date),
  );

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
    .slice(0, 5);

  const prioritizedWork = [...activeWork]
    .sort((a, b) => {
      const aUnpaid = isUnpaid(a.paid_status);
      const bUnpaid = isUnpaid(b.paid_status);

      if (aUnpaid !== bUnpaid) {
        return aUnpaid ? -1 : 1;
      }

      return Number(b.job_value || 0) - Number(a.job_value || 0);
    })
    .slice(0, 5);

  const recentRecords = [
    ...customers.map((customer) => ({
      id: `customer-${customer.id}`,
      type: "Person",
      title: customer.name || "Unnamed person",
      detail: customer.email || customer.phone || "Incomplete contact saved",
      date: customer.created_at,
      href: `/customers/${customer.id}/edit`,
    })),

    ...leads.map((lead) => ({
      id: `lead-${lead.id}`,
      type: "Opportunity",
      title: lead.service_requested || "Untitled opportunity",
      detail: lead.source || lead.status || "No source saved",
      date: lead.created_at,
      href: `/leads/${lead.id}/edit`,
    })),

    ...workRecords.map((work) => ({
      id: `work-${work.id}`,
      type: "Work",
      title: work.service_type || "Untitled work",
      detail: work.status || "No stage saved",
      date: work.created_at,
      href: `/jobs/${work.id}/edit`,
    })),

    ...revenueRecords.map((record) => ({
      id: `revenue-${record.id}`,
      type: "Revenue",
      title: formatCurrency(record.amount),
      detail: record.service_type || record.payment_status || "Revenue record",
      date: record.created_at,
      href: `/sales/${record.id}/edit`,
    })),

    ...followUps.map((action) => ({
      id: `follow-up-${action.id}`,
      type: "Follow-up",
      title: action.message || "Follow up",
      detail: action.status || "Open",
      date: action.created_at,
      href: `/follow-ups/${action.id}/edit`,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
          eyebrow="Home"
          title="Today’s operating view"
          description="See the most important follow-ups, pipeline movement, active work, and cleanup issues in one place."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/follow-ups"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Review follow-ups
              </Link>

              <Link
                href="/imports"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Import data
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Priority items"
            value={priorityQueue.length}
            helper="Follow-ups, payments, and cleanup"
            tone={priorityQueue.length > 0 ? "warning" : "positive"}
          />

          <StatCard
            label="Open pipeline"
            value={formatCurrency(openPipelineValue)}
            helper={`${openLeads.length} open opportunities`}
            tone={openPipelineValue > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Active work"
            value={activeWork.length}
            helper={`${formatCurrency(activeWorkValue)} active value`}
            tone={activeWork.length > 0 ? "warning" : "default"}
          />

          <StatCard
            label="Payment needed"
            value={formatCurrency(unpaidRevenueValue)}
            helper={`${unpaidRevenue.length} records need collection`}
            tone={unpaidRevenue.length > 0 ? "danger" : "positive"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr] items-start">
          <SectionCard
            title="Priority queue"
            description="What needs attention first across follow-ups, payments, and cleanup."
          >
            {priorityQueue.length === 0 ? (
              <EmptyState
                title="Nothing needs attention"
                description="No open follow-ups, unpaid revenue, or important cleanup issues were found."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {priorityQueue.map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-3 p-4 md:grid-cols-[1fr_120px] md:items-center"
                  >
                    <div>
                      <StatusBadge tone={item.tone}>{item.label}</StatusBadge>

                      <p className="mt-2 font-semibold text-slate-950">
                        {item.title}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {item.detail}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <Link
                        href={item.href}
                        className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Open
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Follow-up schedule"
            description="Manual follow-ups and opportunity follow-up dates, sorted by due date."
          >
            {followUpSchedule.length === 0 ? (
              <EmptyState
                title="No follow-ups scheduled"
                description="Add a manual follow-up or set a next follow-up date on an opportunity."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {followUpSchedule.map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-3 p-4 md:grid-cols-[1fr_90px] md:items-center"
                  >
                    <div>
                      <StatusBadge tone={item.tone}>{item.label}</StatusBadge>

                      <p className="mt-2 font-semibold text-slate-950">
                        {item.title}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {item.detail}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <Link
                        href={item.href}
                        className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Open
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <SectionCard
            title="Open opportunities"
            description="Potential business sorted by follow-up need and estimated value."
          >
            {prioritizedOpportunities.length === 0 ? (
              <EmptyState
                title="No open opportunities"
                description="Create or import opportunities to start building the pipeline."
              />
            ) : (
              <div>
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {opportunitiesNeedingFollowUp.length} need follow-up
                      attention
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Missing, due, or overdue follow-up dates.
                    </p>
                  </div>

                  <Link
                    href="/leads"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Manage
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {prioritizedOpportunities.map((lead) => {
                    const customer = lead.customer_id
                      ? customerById.get(lead.customer_id)
                      : null;

                    return (
                      <article
                        key={lead.id}
                        className="grid gap-3 p-4 md:grid-cols-[1fr_110px_135px_90px] md:items-center"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">
                            {lead.service_requested || "Untitled opportunity"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {customer?.name ||
                              lead.source ||
                              "No person linked"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-500">
                            Value
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {formatCurrency(lead.estimated_value)}
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
                              {lead.next_follow_up_date
                                ? getFollowUpLabel(lead.next_follow_up_date)
                                : "Add follow-up"}
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
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Active work"
            description="Work that is scheduled, active, or not yet complete."
          >
            {prioritizedWork.length === 0 ? (
              <EmptyState
                title="No active work"
                description="Create or import work records to track delivery."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {prioritizedWork.map((work) => {
                  const customer = work.customer_id
                    ? customerById.get(work.customer_id)
                    : null;

                  return (
                    <article
                      key={work.id}
                      className="grid gap-3 p-4 md:grid-cols-[1fr_110px_90px] md:items-center"
                    >
                      <div>
                        <p className="font-semibold text-slate-950">
                          {work.service_type || "Untitled work"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {customer?.name ||
                            `Starts ${formatDateOnly(work.start_date)}`}
                        </p>
                      </div>

                      <p className="text-sm font-semibold text-slate-700">
                        {formatCurrency(work.job_value)}
                      </p>

                      <div className="md:text-right">
                        <StatusBadge tone={getStatusTone(work.status)}>
                          {work.status || "Scheduled"}
                        </StatusBadge>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </section>

        <SectionCard
          title="Recently added records"
          description="Newest records added across people, opportunities, work, revenue, and follow-ups."
        >
          {recentRecords.length === 0 ? (
            <EmptyState
              title="No records yet"
              description="Add records manually or import data to start building the workspace."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentRecords.map((record) => (
                <article
                  key={record.id}
                  className="grid gap-3 p-4 md:grid-cols-[120px_1fr_120px_90px] md:items-center"
                >
                  <div>
                    <StatusBadge tone="neutral">{record.type}</StatusBadge>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-950">
                      {record.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {record.detail}
                    </p>
                  </div>

                  <p className="text-sm font-medium text-slate-500 md:text-right">
                    {formatTimestampDate(record.date)}
                  </p>

                  <div className="md:text-right">
                    <Link
                      href={record.href}
                      className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Open
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




