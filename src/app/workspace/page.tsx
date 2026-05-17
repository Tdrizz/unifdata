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
  formatTimestampDate,
  parseDateOnly,
  isTodayOrPast,
  isOverdue,
  isDueToday,
} from "@/lib/date-format";
import { formatCurrency } from "@/lib/utils";
import {
  isClosedOpportunity,
  isCompleteWork,
  isCancelledWork,
  isUnpaid,
  isOpenFollowUp,
  getWorkTone,
} from "@/lib/status";
import { getIndustryProfile } from "@/lib/industry-profiles";

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

function getSortDate(date: string | null | undefined, fallback: string) {
  const parsed = parseDateOnly(date || null);

  if (parsed) {
    return parsed.getTime();
  }

  return new Date(fallback).getTime();
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
  const profile = getIndustryProfile(company.business_sector);

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
    .filter((action) => isOpenFollowUp(action.status))
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
      label: `${profile.labels.leadSingular} follow-up`,
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
        title: customer.name || `${profile.labels.customerSingular} needs contact`,
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
        title: customer.name || `${profile.labels.customerSingular} needs address`,
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
        title: lead.service_requested || `${profile.labels.leadSingular} needs source`,
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
        title: lead.service_requested || `${profile.labels.leadSingular} needs estimate`,
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
        label: `Add ${profile.labels.jobSingular.toLowerCase()} value`,
        title: work.service_type || `${profile.labels.jobSingular} needs value`,
        detail: "Value keeps operational reporting accurate.",
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
      type: profile.labels.customerSingular,
      title: customer.name || `Unnamed ${profile.labels.customerSingular.toLowerCase()}`,
      detail: customer.email || customer.phone || "Incomplete contact saved",
      date: customer.created_at,
      href: `/customers/${customer.id}/edit`,
    })),

    ...leads.map((lead) => ({
      id: `lead-${lead.id}`,
      type: profile.labels.leadSingular,
      title: lead.service_requested || `Untitled ${profile.labels.leadSingular.toLowerCase()}`,
      detail: lead.source || lead.status || "No source saved",
      date: lead.created_at,
      href: `/leads/${lead.id}/edit`,
    })),

    ...workRecords.map((work) => ({
      id: `work-${work.id}`,
      type: profile.labels.jobSingular,
      title: work.service_type || `Untitled ${profile.labels.jobSingular.toLowerCase()}`,
      detail: work.status || "No stage saved",
      date: work.created_at,
      href: `/jobs/${work.id}/edit`,
    })),

    ...revenueRecords.map((record) => ({
      id: `revenue-${record.id}`,
      type: profile.labels.saleSingular,
      title: formatCurrency(record.amount),
      detail: record.service_type || record.payment_status || `${profile.labels.saleSingular} record`,
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

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function queueDotClass(tone: QueueItem["tone"]) {
    if (tone === "danger") return "bg-red-500";
    if (tone === "warning") return "bg-amber-500";
    if (tone === "success") return "bg-emerald-500";
    return "bg-[#c5bfb5]";
  }

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
          eyebrow={`${todayLabel} · Operating brief`}
          title={`Good morning, ${company.name}`}
          description={profile.dailyFocus}
          actions={
            <div className="flex gap-2">
              <Link
                href="/follow-ups"
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-3 py-2 text-[13px] font-semibold text-ud-muted hover:text-ud-ink shadow-[0_1px_0_rgba(23,22,20,0.04)]"
              >
                Follow-ups
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

        <div className="mb-6 rounded-[14px] border border-white/[0.06] bg-gradient-to-br from-[#0d1520] to-[#1a2540] p-6">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B80E0]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#6B5FCC]" />
            AI Operating Brief
          </p>
          <p className="text-[14px] leading-[1.65] text-[#c2d4e4]">
            {profile.dailyFocus}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Priority Items"
            value={priorityQueue.length}
            tone={priorityQueue.length > 0 ? "warning" : "default"}
          />
          <StatCard
            label={profile.priorityNames.pipeline}
            value={formatCurrency(openPipelineValue)}
            tone={openPipelineValue > 0 ? "positive" : "default"}
          />
          <StatCard
            label={profile.priorityNames.activeWork}
            value={activeWork.length}
            helper={`${formatCurrency(activeWorkValue)} active value`}
            tone="default"
          />
          <StatCard
            label={`${profile.labels.saleSingular} needed`}
            value={formatCurrency(unpaidRevenueValue)}
            tone={unpaidRevenueValue > 0 ? "danger" : "default"}
          />
        </div>

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
              <div>
                {priorityQueue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3.5 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 hover:bg-ud-surface-soft transition-colors"
                  >
                    <div className={`h-2 w-2 shrink-0 rounded-full ${queueDotClass(item.tone)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-ud-ink truncate">{item.title}</p>
                      <p className="text-[12px] text-ud-muted mt-0.5">{item.detail}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[12px] font-semibold text-ud-muted">{item.label}</span>
                      <Link href={item.href} className="text-[12px] font-semibold text-[#4A3FA8] hover:underline">Open →</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Follow-up schedule"
            description={`Manual follow-ups and ${profile.labels.leadSingular.toLowerCase()} follow-up dates, sorted by due date.`}
          >
            {followUpSchedule.length === 0 ? (
              <EmptyState
                title="No follow-ups scheduled"
                description={`Add a manual follow-up or set a next follow-up date on a ${profile.labels.leadSingular.toLowerCase()}.`}
              />
            ) : (
              <div>
                {followUpSchedule.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3.5 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 hover:bg-ud-surface-soft transition-colors"
                  >
                    <div className={`h-2 w-2 shrink-0 rounded-full ${queueDotClass(item.tone)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-ud-ink truncate">{item.title}</p>
                      <p className="text-[12px] text-ud-muted mt-0.5">{item.detail}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[12px] font-semibold text-ud-muted">{item.label}</span>
                      <Link href={item.href} className="text-[12px] font-semibold text-[#4A3FA8] hover:underline">Open →</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <SectionCard
            title={`Open ${profile.labels.leadPlural.toLowerCase()}`}
            description={`${profile.labels.leadPlural} sorted by follow-up need and estimated value.`}
            actions={
              <Link
                href="/leads"
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-3 py-2 text-[12px] font-semibold text-ud-muted hover:text-ud-ink shadow-[0_1px_0_rgba(23,22,20,0.04)]"
              >
                Manage
              </Link>
            }
          >
            {prioritizedOpportunities.length === 0 ? (
              <EmptyState
                title={`No open ${profile.labels.leadPlural.toLowerCase()}`}
                description={`Create or import ${profile.labels.leadPlural.toLowerCase()} to start building the pipeline.`}
              />
            ) : (
              <div>
                {opportunitiesNeedingFollowUp.length > 0 && (
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-[rgba(23,22,20,0.05)] bg-ud-surface-soft">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <p className="text-[12px] font-semibold text-ud-muted">
                      {opportunitiesNeedingFollowUp.length} {profile.labels.leadPlural.toLowerCase()} need follow-up — missing, due, or overdue dates.
                    </p>
                  </div>
                )}
                {prioritizedOpportunities.map((lead) => {
                  const customer = lead.customer_id
                    ? customerById.get(lead.customer_id)
                    : null;
                  const followUpTone = getFollowUpTone(lead.next_follow_up_date);

                  return (
                    <div
                      key={lead.id}
                      className="flex items-center gap-3.5 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 hover:bg-ud-surface-soft transition-colors"
                    >
                      <div className={`h-2 w-2 shrink-0 rounded-full ${queueDotClass(followUpTone)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-ud-ink truncate">
                          {lead.service_requested || "Untitled opportunity"}
                        </p>
                        <p className="text-[12px] text-ud-muted mt-0.5">
                          {customer?.name || lead.source || `No ${profile.labels.customerSingular.toLowerCase()} linked`}
                          {" · "}
                          {formatCurrency(lead.estimated_value)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[12px] font-semibold text-ud-muted">
                          {lead.next_follow_up_date
                            ? getFollowUpLabel(lead.next_follow_up_date)
                            : "No follow-up"}
                        </span>
                        <Link href={`/leads/${lead.id}/edit`} className="text-[12px] font-semibold text-[#4A3FA8] hover:underline">Open →</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title={`Active ${profile.labels.jobPlural.toLowerCase()}`}
            description={`${profile.labels.jobPlural} that are scheduled, active, or not yet complete.`}
          >
            {prioritizedWork.length === 0 ? (
              <EmptyState
                title={`No active ${profile.labels.jobPlural.toLowerCase()}`}
                description={`Create or import ${profile.labels.jobPlural.toLowerCase()} to track delivery.`}
              />
            ) : (
              <div>
                {prioritizedWork.map((work) => {
                  const customer = work.customer_id
                    ? customerById.get(work.customer_id)
                    : null;
                  const workTone = getWorkTone(work.status);
                  const dotTone: QueueItem["tone"] =
                    workTone === "success" ? "success" :
                    workTone === "warning" ? "warning" :
                    workTone === "danger" ? "danger" : "neutral";

                  return (
                    <div
                      key={work.id}
                      className="flex items-center gap-3.5 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 hover:bg-ud-surface-soft transition-colors"
                    >
                      <div className={`h-2 w-2 shrink-0 rounded-full ${queueDotClass(dotTone)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-ud-ink truncate">
                          {work.service_type || "Untitled work"}
                        </p>
                        <p className="text-[12px] text-ud-muted mt-0.5">
                          {customer?.name || `Starts ${formatDateOnly(work.start_date)}`}
                          {" · "}
                          {formatCurrency(work.job_value)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[12px] font-semibold text-ud-muted">{work.status || "Scheduled"}</span>
                        <Link href={`/jobs/${work.id}/edit`} className="text-[12px] font-semibold text-[#4A3FA8] hover:underline">Open →</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </section>

        <SectionCard
          title="Recently added records"
          description={`Newest records added across ${profile.labels.customerPlural.toLowerCase()}, ${profile.labels.leadPlural.toLowerCase()}, ${profile.labels.jobPlural.toLowerCase()}, ${profile.labels.salePlural.toLowerCase()}, and follow-ups.`}
        >
          {recentRecords.length === 0 ? (
            <EmptyState
              title="No records yet"
              description="Add records manually or import data to start building the workspace."
            />
          ) : (
            <div>
              {recentRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-3.5 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 hover:bg-ud-surface-soft transition-colors"
                >
                  <div className="h-2 w-2 shrink-0 rounded-full bg-[#c5bfb5]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-ud-ink truncate">{record.title}</p>
                    <p className="text-[12px] text-ud-muted mt-0.5">{record.detail}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[12px] font-semibold text-ud-muted">
                      {record.type} · {formatTimestampDate(record.date)}
                    </span>
                    <Link href={record.href} className="text-[12px] font-semibold text-[#4A3FA8] hover:underline">Open →</Link>
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
