import Link from "next/link";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { DataHubPageData } from "../queries";

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

export function DataHubView({ customers, opportunities, workRecords, revenueRecords, followUps, profile }: Props) {
  const { customerSingular, customerPlural, leadSingular, leadPlural, jobSingular, jobPlural, salePlural, followUpPlural } = profile.labels;

  // Customer issues
  const missingEmail = customers.filter((c) => !c.email);
  const missingPhone = customers.filter((c) => !c.phone);
  const missingAddress = customers.filter((c) => !c.address);

  // Lead/pipeline issues
  const openLeads = opportunities.filter((l) => isOpenStatus(l.status));
  const leadMissingCustomer = openLeads.filter((l) => !l.customer_id);
  const leadMissingValue = openLeads.filter((l) => l.estimated_value === null || l.estimated_value === undefined);
  const leadMissingSource = openLeads.filter((l) => !l.source);
  const leadNoFollowUp = openLeads.filter((l) => !l.next_follow_up_date);

  // Job issues
  const orphanJobs = workRecords.filter((w) => !w.customer_id);
  const jobMissingValue = workRecords.filter((w) => w.job_value === null || w.job_value === undefined);

  // Follow-up issues
  const openFollowUps = followUps.filter((f) => {
    const s = (f.status || "").toLowerCase();
    return !s.includes("complete") && !s.includes("done") && !s.includes("closed");
  });
  const overdueFollowUps = openFollowUps.filter((f) => isOverdueDate(f.due_date));
  const followUpNoDueDate = openFollowUps.filter((f) => !f.due_date);

  // Sales issues
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
    // Critical: missing contact info
    ...(missingEmail.length > 0 ? [{
      id: "missing-email",
      dot: "danger" as const,
      title: `${missingEmail.length} ${customerPlural.toLowerCase()} missing email`,
      meta: `${customerPlural} · Needed for outreach and follow-up`,
      count: missingEmail.length,
      href: "/customers",
    }] : []),
    ...(missingPhone.length > 0 ? [{
      id: "missing-phone",
      dot: "warning" as const,
      title: `${missingPhone.length} ${customerPlural.toLowerCase()} missing phone number`,
      meta: `${customerPlural} · Limits how quickly you can reach ${customerPlural.toLowerCase()}`,
      count: missingPhone.length,
      href: "/customers",
    }] : []),
    // Pipeline gaps
    ...(leadMissingCustomer.length > 0 ? [{
      id: "lead-no-customer",
      dot: "warning" as const,
      title: `${leadMissingCustomer.length} open ${leadPlural.toLowerCase()} not linked to a ${customerSingular.toLowerCase()}`,
      meta: `${leadPlural} · Breaks history and lifetime value`,
      count: leadMissingCustomer.length,
      href: "/crm",
    }] : []),
    ...(leadMissingValue.length > 0 ? [{
      id: "lead-no-value",
      dot: "neutral" as const,
      title: `${leadMissingValue.length} open ${leadPlural.toLowerCase()} missing estimated value`,
      meta: `${leadPlural} · Pipeline value will be understated`,
      count: leadMissingValue.length,
      href: "/crm",
    }] : []),
    ...(leadNoFollowUp.length > 0 ? [{
      id: "lead-no-followup",
      dot: "warning" as const,
      title: `${leadNoFollowUp.length} open ${leadPlural.toLowerCase()} with no follow-up date`,
      meta: `${leadPlural} · At risk of going cold`,
      count: leadNoFollowUp.length,
      href: "/crm",
    }] : []),
    ...(leadMissingSource.length > 0 ? [{
      id: "lead-no-source",
      dot: "neutral" as const,
      title: `${leadMissingSource.length} open ${leadPlural.toLowerCase()} missing source`,
      meta: `${leadPlural} · Source data helps show which channels are working`,
      count: leadMissingSource.length,
      href: "/crm",
    }] : []),
    // Job issues
    ...(orphanJobs.length > 0 ? [{
      id: "orphan-jobs",
      dot: "neutral" as const,
      title: `${orphanJobs.length} ${jobPlural.toLowerCase()} not linked to a ${customerSingular.toLowerCase()}`,
      meta: `${jobPlural} · Breaks lifetime value and history`,
      count: orphanJobs.length,
      href: "/jobs",
    }] : []),
    ...(jobMissingValue.length > 0 ? [{
      id: "job-no-value",
      dot: "neutral" as const,
      title: `${jobMissingValue.length} ${jobPlural.toLowerCase()} missing job value`,
      meta: `${jobPlural} · Revenue reports will be incomplete`,
      count: jobMissingValue.length,
      href: "/jobs",
    }] : []),
    // Follow-up issues
    ...(overdueFollowUps.length > 0 ? [{
      id: "overdue-followups",
      dot: "danger" as const,
      title: `${overdueFollowUps.length} overdue ${followUpPlural.toLowerCase()}`,
      meta: `${followUpPlural} · These are past their due date`,
      count: overdueFollowUps.length,
      href: "/follow-ups",
    }] : []),
    ...(followUpNoDueDate.length > 0 ? [{
      id: "followup-no-date",
      dot: "neutral" as const,
      title: `${followUpNoDueDate.length} ${followUpPlural.toLowerCase()} with no due date`,
      meta: `${followUpPlural} · Hard to prioritize without a date`,
      count: followUpNoDueDate.length,
      href: "/follow-ups",
    }] : []),
    // Revenue issues
    ...(unpaidSales.length > 0 ? [{
      id: "unpaid-sales",
      dot: "warning" as const,
      title: `${unpaidSales.length} ${salePlural.toLowerCase()} unpaid`,
      meta: `${salePlural} · Outstanding payments to collect`,
      count: unpaidSales.length,
      href: "/sales",
    }] : []),
    // Address
    ...(missingAddress.length > 0 ? [{
      id: "missing-address",
      dot: "neutral" as const,
      title: `${missingAddress.length} ${customerPlural.toLowerCase()} missing address`,
      meta: `${customerPlural} · Useful for routing and service records`,
      count: missingAddress.length,
      href: "/customers",
    }] : []),
  ].sort((a, b) => {
    const order = { danger: 0, warning: 1, neutral: 2 };
    return order[a.dot] - order[b.dot];
  });

  return (
    <div style={{ padding: "28px 28px 40px" }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Data Hub</div>
          <div className="page-title">Data quality</div>
          <div className="page-desc">Identify and fix issues across your workspace.</div>
        </div>
      </div>

      {/* Stat row */}
      <div className="stat-row stat-row-5 mb-5">
        <div className="stat-card s-accent">
          <div className="stat-label">Data health</div>
          <div className="stat-value">{healthPct}%</div>
          <div className="health-bar-track">
            <div className="health-bar-fill" style={{ width: `${healthPct}%` }} />
          </div>
          <div className="stat-helper">{totalIssues} fixes available</div>
        </div>
        <div className={`stat-card ${customerIssues > 0 ? "s-danger" : ""}`}>
          <div className="stat-label">{customerPlural}</div>
          <div className={`stat-value ${customerIssues > 0 ? "c-danger" : ""}`}>{customerIssues}</div>
          <div className="stat-helper">Contact info gaps</div>
        </div>
        <div className={`stat-card ${pipelineIssues > 0 ? "s-warning" : ""}`}>
          <div className="stat-label">Pipeline</div>
          <div className={`stat-value ${pipelineIssues > 0 ? "c-warning" : ""}`}>{pipelineIssues}</div>
          <div className="stat-helper">{leadSingular} data gaps</div>
        </div>
        <div className={`stat-card ${workIssues > 0 ? "" : ""}`}>
          <div className="stat-label">{jobSingular} & follow-ups</div>
          <div className="stat-value">{workIssues}</div>
          <div className="stat-helper">Unlinked or overdue</div>
        </div>
        <div className={`stat-card ${revenueIssues > 0 ? "s-danger" : ""}`}>
          <div className="stat-label">Unpaid {salePlural.toLowerCase()}</div>
          <div className={`stat-value ${revenueIssues > 0 ? "c-danger" : ""}`}>{revenueIssues}</div>
          <div className="stat-helper">Outstanding payments</div>
        </div>
      </div>

      {/* Issues card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Issues to resolve</div>
            <div className="card-desc">Last scanned today at {scanTime} · sorted by impact</div>
          </div>
        </div>
        <div>
          {issues.length === 0 ? (
            <div className="queue-item">
              <div className="queue-body">
                <div className="queue-meta" style={{ textAlign: "center", padding: "12px 0" }}>
                  No issues found. Your data looks clean!
                </div>
              </div>
            </div>
          ) : (
            issues.map((issue) => (
              <div key={issue.id} className="queue-item">
                <div className={`queue-dot queue-dot-${issue.dot}`} />
                <div className="queue-body">
                  <div className="queue-action">{issue.title}</div>
                  <div className="queue-meta">{issue.meta}</div>
                </div>
                <Link href={issue.href} className="btn btn-ghost btn-sm">
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
