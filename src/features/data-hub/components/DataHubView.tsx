import Link from "next/link";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { DataHubPageData } from "../queries";
import { PageHeader } from "@/components/ui/PageHeader";

type Props = DataHubPageData & {
  profile: IndustryProfile;
};

function isOpenStatus(status: string | null) {
  const s = (status || "").toLowerCase();
  return !s.includes("won") && !s.includes("lost") && !s.includes("cancel") && !s.includes("complete") && !s.includes("closed") && !s.includes("done") && !s.includes("declined");
}

function isOverdueDate(date: string | null) {
  if (!date) return false;
  return new Date(date) < new Date(new Date().toDateString());
}

const btnGhostSm = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-[color,border-color] duration-[120ms]";

export function DataHubView({ customers, opportunities, workRecords, revenueRecords, followUps, profile }: Props) {
  const { customerSingular, customerPlural, leadSingular, leadPlural, jobSingular, jobPlural, salePlural, followUpPlural } = profile.labels;

  const missingEmail = customers.filter((c) => !c.email);
  const missingPhone = customers.filter((c) => !c.phone);
  const missingAddress = customers.filter((c) => !c.address);

  const openLeads = opportunities.filter((l) => isOpenStatus(l.status));
  const leadMissingCustomer = openLeads.filter((l) => !l.customer_id);
  const leadMissingValue = openLeads.filter((l) => l.estimated_value === null || l.estimated_value === undefined);
  const leadMissingSource = openLeads.filter((l) => !l.source);
  const leadNoFollowUp = openLeads.filter((l) => !l.next_follow_up_date);

  const orphanJobs = workRecords.filter((w) => !w.customer_id);
  const jobMissingValue = workRecords.filter((w) => w.job_value === null || w.job_value === undefined);

  const openFollowUps = followUps.filter((f) => {
    const s = (f.status || "").toLowerCase();
    return !s.includes("complete") && !s.includes("done") && !s.includes("closed");
  });
  const overdueFollowUps = openFollowUps.filter((f) => isOverdueDate(f.due_date));
  const followUpNoDueDate = openFollowUps.filter((f) => !f.due_date);

  const unpaidSales = revenueRecords.filter((s) => {
    const ps = (s.payment_status || "").toLowerCase();
    return ps === "unpaid" || ps === "pending" || ps === "" || !s.payment_status;
  });

  const customerIssues = missingEmail.length + missingPhone.length + missingAddress.length;
  const pipelineIssues = leadMissingCustomer.length + leadMissingValue.length + leadMissingSource.length + leadNoFollowUp.length;
  const workIssues = orphanJobs.length + jobMissingValue.length + overdueFollowUps.length + followUpNoDueDate.length;
  const revenueIssues = unpaidSales.length;
  const totalIssues = customerIssues + pipelineIssues + workIssues + revenueIssues;

  const totalRecords = customers.length + opportunities.length + workRecords.length + revenueRecords.length + followUps.length;
  const healthPct = totalRecords === 0 ? 100 : Math.max(0, Math.min(100, Math.round(100 - (totalIssues / Math.max(totalRecords, 1)) * 100)));

  const now = new Date();
  const scanTime = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  type Issue = {
    id: string;
    dot: "danger" | "warning" | "neutral";
    title: string;
    meta: string;
    count: number;
    href: string;
  };

  const issues: Issue[] = [
    ...(missingEmail.length > 0 ? [{ id: "missing-email", dot: "danger" as const, title: `${missingEmail.length} ${customerPlural.toLowerCase()} missing email`, meta: `${customerPlural} · Needed for outreach and follow-up`, count: missingEmail.length, href: "/customers" }] : []),
    ...(missingPhone.length > 0 ? [{ id: "missing-phone", dot: "warning" as const, title: `${missingPhone.length} ${customerPlural.toLowerCase()} missing phone number`, meta: `${customerPlural} · Limits how quickly you can reach ${customerPlural.toLowerCase()}`, count: missingPhone.length, href: "/customers" }] : []),
    ...(leadMissingCustomer.length > 0 ? [{ id: "lead-no-customer", dot: "warning" as const, title: `${leadMissingCustomer.length} open ${leadPlural.toLowerCase()} not linked to a ${customerSingular.toLowerCase()}`, meta: `${leadPlural} · Breaks history and lifetime value`, count: leadMissingCustomer.length, href: "/crm" }] : []),
    ...(leadMissingValue.length > 0 ? [{ id: "lead-no-value", dot: "neutral" as const, title: `${leadMissingValue.length} open ${leadPlural.toLowerCase()} missing estimated value`, meta: `${leadPlural} · Pipeline value will be understated`, count: leadMissingValue.length, href: "/crm" }] : []),
    ...(leadNoFollowUp.length > 0 ? [{ id: "lead-no-followup", dot: "warning" as const, title: `${leadNoFollowUp.length} open ${leadPlural.toLowerCase()} with no follow-up date`, meta: `${leadPlural} · At risk of going cold`, count: leadNoFollowUp.length, href: "/crm" }] : []),
    ...(leadMissingSource.length > 0 ? [{ id: "lead-no-source", dot: "neutral" as const, title: `${leadMissingSource.length} open ${leadPlural.toLowerCase()} missing source`, meta: `${leadPlural} · Source data helps show which channels are working`, count: leadMissingSource.length, href: "/crm" }] : []),
    ...(orphanJobs.length > 0 ? [{ id: "orphan-jobs", dot: "neutral" as const, title: `${orphanJobs.length} ${jobPlural.toLowerCase()} not linked to a ${customerSingular.toLowerCase()}`, meta: `${jobPlural} · Breaks lifetime value and history`, count: orphanJobs.length, href: "/jobs" }] : []),
    ...(jobMissingValue.length > 0 ? [{ id: "job-no-value", dot: "neutral" as const, title: `${jobMissingValue.length} ${jobPlural.toLowerCase()} missing job value`, meta: `${jobPlural} · Revenue reports will be incomplete`, count: jobMissingValue.length, href: "/jobs" }] : []),
    ...(overdueFollowUps.length > 0 ? [{ id: "overdue-followups", dot: "danger" as const, title: `${overdueFollowUps.length} overdue ${followUpPlural.toLowerCase()}`, meta: `${followUpPlural} · These are past their due date`, count: overdueFollowUps.length, href: "/follow-ups" }] : []),
    ...(followUpNoDueDate.length > 0 ? [{ id: "followup-no-date", dot: "neutral" as const, title: `${followUpNoDueDate.length} ${followUpPlural.toLowerCase()} with no due date`, meta: `${followUpPlural} · Hard to prioritize without a date`, count: followUpNoDueDate.length, href: "/follow-ups" }] : []),
    ...(unpaidSales.length > 0 ? [{ id: "unpaid-sales", dot: "warning" as const, title: `${unpaidSales.length} ${salePlural.toLowerCase()} unpaid`, meta: `${salePlural} · Outstanding payments to collect`, count: unpaidSales.length, href: "/sales" }] : []),
    ...(missingAddress.length > 0 ? [{ id: "missing-address", dot: "neutral" as const, title: `${missingAddress.length} ${customerPlural.toLowerCase()} missing address`, meta: `${customerPlural} · Useful for routing and service records`, count: missingAddress.length, href: "/customers" }] : []),
  ].sort((a, b) => {
    const order = { danger: 0, warning: 1, neutral: 2 };
    return order[a.dot] - order[b.dot];
  });

  const dotClass = (dot: "danger" | "warning" | "neutral") => {
    if (dot === "danger") return "w-2 h-2 rounded-full bg-[#e05050] shrink-0";
    if (dot === "warning") return "w-2 h-2 rounded-full bg-[#d97706] shrink-0";
    return "w-2 h-2 rounded-full bg-[#c5bfb5] shrink-0";
  };

  return (
    <div className="px-7 pb-10 pt-7">
      <PageHeader
        eyebrow="Data Hub"
        title="Data quality"
        description="Identify and fix issues across your workspace."
        className="mb-6"
      />

      {/* Stat row */}
      <div className="grid grid-cols-5 gap-3 mb-[22px]">
        {/* Health score */}
        <div className="bg-ud-accent-tint border border-ud-accent/20 rounded-[16px] p-5 shadow-ud">
          <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-ud-faint">Data health</div>
          <div className="text-[30px] font-bold tracking-[-0.03em] text-ud-ink mt-1.5 leading-none">{healthPct}%</div>
          <div className="h-2 bg-ud-surface-sunk rounded-full overflow-hidden my-2">
            <div className="h-full rounded-full" style={{ width: `${healthPct}%`, background: "linear-gradient(90deg, #2a8c3c, #4ade80)" }} />
          </div>
          <div className="text-[12px] text-ud-muted">{totalIssues} fixes available</div>
        </div>
        {/* Customers */}
        <div className={`bg-ud-surface border rounded-[16px] p-5 shadow-ud ${customerIssues > 0 ? "bg-[#fef8f8] border-[rgba(160,40,40,0.12)]" : "border-[rgba(0,0,0,0.06)]"}`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-ud-faint">{customerPlural}</div>
          <div className={`text-[30px] font-bold tracking-[-0.03em] mt-1.5 leading-none ${customerIssues > 0 ? "text-ud-danger" : "text-ud-ink"}`}>{customerIssues}</div>
          <div className="text-[12px] text-ud-muted mt-1.5">Contact info gaps</div>
        </div>
        {/* Pipeline */}
        <div className={`bg-ud-surface border rounded-[16px] p-5 shadow-ud ${pipelineIssues > 0 ? "bg-[#fefaf4] border-[rgba(138,80,16,0.12)]" : "border-[rgba(0,0,0,0.06)]"}`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-ud-faint">Pipeline</div>
          <div className={`text-[30px] font-bold tracking-[-0.03em] mt-1.5 leading-none ${pipelineIssues > 0 ? "text-ud-warning" : "text-ud-ink"}`}>{pipelineIssues}</div>
          <div className="text-[12px] text-ud-muted mt-1.5">{leadSingular} data gaps</div>
        </div>
        {/* Jobs */}
        <div className="bg-ud-surface border border-[rgba(0,0,0,0.06)] rounded-[16px] p-5 shadow-ud">
          <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-ud-faint">{jobSingular} &amp; follow-ups</div>
          <div className="text-[30px] font-bold tracking-[-0.03em] text-ud-ink mt-1.5 leading-none">{workIssues}</div>
          <div className="text-[12px] text-ud-muted mt-1.5">Unlinked or overdue</div>
        </div>
        {/* Revenue */}
        <div className={`bg-ud-surface border rounded-[16px] p-5 shadow-ud ${revenueIssues > 0 ? "bg-[#fef8f8] border-[rgba(160,40,40,0.12)]" : "border-[rgba(0,0,0,0.06)]"}`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-ud-faint">Unpaid {salePlural.toLowerCase()}</div>
          <div className={`text-[30px] font-bold tracking-[-0.03em] mt-1.5 leading-none ${revenueIssues > 0 ? "text-ud-danger" : "text-ud-ink"}`}>{revenueIssues}</div>
          <div className="text-[12px] text-ud-muted mt-1.5">Outstanding payments</div>
        </div>
      </div>

      {/* Issues card */}
      <div className="bg-ud-surface border border-[rgba(0,0,0,0.06)] rounded-[var(--radius-ud-lg)] shadow-ud overflow-hidden">
        <div className="px-[22px] py-4 border-b border-[rgba(0,0,0,0.05)] flex items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-semibold text-ud-ink">Issues to resolve</p>
            <p className="text-[12px] text-ud-muted mt-0.5">Last scanned today at {scanTime} · sorted by impact</p>
          </div>
        </div>
        <div>
          {issues.length === 0 ? (
            <div className="flex items-center gap-3.5 px-5 py-[14px]">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-ud-muted text-center py-3">No issues found. Your data looks clean!</p>
              </div>
            </div>
          ) : (
            issues.map((issue) => (
              <div key={issue.id} className="flex items-center gap-3.5 px-5 py-[14px] border-b border-[rgba(0,0,0,0.04)] last:border-b-0 hover:bg-[rgba(0,0,0,0.015)] transition-colors">
                <div className={dotClass(issue.dot)} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-ud-ink truncate">{issue.title}</p>
                  <p className="text-[12px] text-ud-muted mt-0.5">{issue.meta}</p>
                </div>
                <Link href={issue.href} className={btnGhostSm}>
                  View →
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
