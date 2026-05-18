import Link from "next/link";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { DataHubPageData } from "../queries";

type Props = DataHubPageData & {
  profile: IndustryProfile;
};

export function DataHubView({ customers, workRecords, revenueRecords, followUps }: Props) {
  const missingEmails = customers.filter((c) => !c.email).length;
  const missingPhones = customers.filter((c) => !c.phone).length;
  const orphanJobs = workRecords.filter((w) => !w.customer_id).length;
  const totalIssues = missingEmails + orphanJobs;
  const totalRecords = customers.length + workRecords.length + revenueRecords.length + followUps.length;
  const healthPct = totalRecords === 0 ? 100 : Math.max(0, Math.min(100, Math.round(100 - (totalIssues / Math.max(totalRecords, 1)) * 100)));

  const now = new Date();
  const scanTime = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  type Issue = {
    id: string;
    dot: "danger" | "warning" | "neutral";
    title: string;
    meta: string;
    count: number;
    primaryAction: string;
    primaryHref: string;
    secondaryAction?: string;
    secondaryHref?: string;
  };

  const issues: Issue[] = [
    ...(missingEmails > 0 ? [{
      id: "missing-emails",
      dot: "danger" as const,
      title: `${missingEmails} clients are missing email addresses`,
      meta: "Clients · High impact — prevents AI outreach and follow-up automation",
      count: missingEmails,
      primaryAction: `View ${missingEmails}`,
      primaryHref: "/customers",
      secondaryAction: "Fix",
      secondaryHref: "/customers",
    }] : []),
    ...(orphanJobs > 0 ? [{
      id: "orphan-jobs",
      dot: "neutral" as const,
      title: `${orphanJobs} job records not linked to any client`,
      meta: "Visits · Breaks lifetime value calculations and history",
      count: orphanJobs,
      primaryAction: `View ${orphanJobs}`,
      primaryHref: "/jobs",
      secondaryAction: "Link",
      secondaryHref: "/jobs",
    }] : []),
    ...(missingPhones > 0 ? [{
      id: "missing-phones",
      dot: "warning" as const,
      title: `${missingPhones} clients are missing phone numbers`,
      meta: "Clients · Reduces ability to reach clients quickly",
      count: missingPhones,
      primaryAction: `View ${missingPhones}`,
      primaryHref: "/customers",
    }] : []),
  ];

  return (
    <div className="hidden md:block" style={{ padding: "28px 28px 40px" }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Data Hub</div>
          <div className="page-title">Data quality</div>
          <div className="page-desc">Identify and fix issues across your workspace.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost">Run scan</button>
        </div>
      </div>

      {/* Stat row */}
      <div className="stat-row stat-row-4 mb-5">
        <div className="stat-card s-accent">
          <div className="stat-label">Data health</div>
          <div className="stat-value">{healthPct}%</div>
          <div className="health-bar-track">
            <div className="health-bar-fill" style={{ width: `${healthPct}%` }} />
          </div>
          <div className="stat-helper">{totalIssues} fixes available</div>
        </div>
        <div className={`stat-card ${missingEmails > 0 ? "s-danger" : ""}`}>
          <div className="stat-label">Missing emails</div>
          <div className={`stat-value ${missingEmails > 0 ? "c-danger" : ""}`}>{missingEmails}</div>
          <div className="stat-helper">Clients without email</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Duplicates</div>
          <div className="stat-value">—</div>
          <div className="stat-helper">Possible duplicate records</div>
        </div>
        <div className={`stat-card ${orphanJobs > 0 ? "" : ""}`}>
          <div className="stat-label">Orphan records</div>
          <div className="stat-value">{orphanJobs}</div>
          <div className="stat-helper">Jobs with no client linked</div>
        </div>
      </div>

      {/* Issues card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Issues to resolve</div>
            <div className="card-desc">Last scanned today at {scanTime} · sorted by impact</div>
          </div>
          <button className="btn btn-ghost btn-sm">Export report</button>
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
                <Link href={issue.primaryHref} className="btn btn-ghost btn-sm" style={{ marginRight: "8px" }}>
                  {issue.primaryAction}
                </Link>
                {issue.secondaryAction && issue.secondaryHref && (
                  <Link href={issue.secondaryHref} className={issue.dot === "danger" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}>
                    {issue.secondaryAction}
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
