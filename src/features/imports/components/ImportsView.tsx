import { CsvImportSessionFlow } from "@/app/imports/CsvImportSessionFlow";
import { GoogleSheetsImportFlow } from "@/app/imports/GoogleSheetsImportFlow";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { ImportsPageData } from "../queries";

type Props = ImportsPageData & { profile: IndustryProfile };

function formatImportDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getRecordTypeLabel(rt: string | null) {
  const map: Record<string, string> = {
    relationships: "Clients",
    opportunities: "Opportunities",
    work: "Visits",
    revenue: "Revenue",
    actions: "Follow-ups",
  };
  return map[rt || ""] || rt || "Records";
}

function sessionStatusBadge(status: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "committed") return "badge badge-success";
  if (s === "failed" || s === "error") return "badge badge-danger";
  if (s === "ready" || s === "draft" || s === "analyzing") return "badge badge-warning";
  return "badge badge-neutral";
}

function sessionStatusLabel(session: ImportsPageData["importSessions"][number]) {
  if (session.status === "committed") return "Complete";
  if (session.status === "failed") return "Failed";
  if (session.error_rows && session.error_rows > 0) return `${session.error_rows} errors`;
  return session.status || "—";
}

const INTEGRATIONS = [
  {
    id: "quickbooks",
    name: "QuickBooks",
    meta: "Sync customers, invoices, and revenue",
    iconBg: "#fef3c7",
    iconStroke: "#92400e",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth={1.8} strokeLinecap="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    id: "jobber",
    name: "Jobber",
    meta: "Sync jobs, quotes, and field schedules",
    iconBg: "#e0e7ff",
    iconStroke: "#3730a3",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3730a3" strokeWidth={1.8} strokeLinecap="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 12h20"/>
      </svg>
    ),
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    meta: "Pull scheduled appointments in as visits",
    iconBg: "#f0fdf4",
    iconStroke: "#166534",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth={1.8} strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
  },
  {
    id: "hubspot",
    name: "HubSpot",
    meta: "Sync contacts and deal activity",
    iconBg: "#fff4ee",
    iconStroke: "#c2410c",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth={1.8} strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: "square",
    name: "Square",
    meta: "Import payments, invoices, and customer records",
    iconBg: "#f1f5f9",
    iconStroke: "#334155",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth={1.8} strokeLinecap="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
];

export function ImportsView({ importSessions, integrations }: Props) {
  const connectedIds = new Set(integrations.map((i) => i.provider?.toLowerCase()));

  return (
    <div className="hidden md:block" style={{ padding: "28px 28px 40px" }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Imports</div>
          <div className="page-title">Import data</div>
          <div className="page-desc">Bring in clients, jobs, or revenue from a CSV or Google Sheets.</div>
        </div>
      </div>

      {/* Two import cards */}
      <div className="grid-2-even mb-5">
        {/* CSV card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Upload a CSV</div>
              <div className="card-desc">Drag a file or click to browse</div>
            </div>
          </div>
          <div className="card-body">
            <CsvImportSessionFlow />
          </div>
        </div>

        {/* Google Sheets card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Google Sheets</div>
              <div className="card-desc">Import from a spreadsheet URL</div>
            </div>
          </div>
          <div className="card-body">
            <GoogleSheetsImportFlow />
          </div>
        </div>
      </div>

      {/* Sync integrations */}
      <div className="card mb-5">
        <div className="card-header">
          <div>
            <div className="card-title">Sync from integrations</div>
            <div className="card-desc">Pull data directly from connected tools — no file needed</div>
          </div>
        </div>
        <div>
          {INTEGRATIONS.map((integration) => {
            const connected = connectedIds.has(integration.id);
            return (
              <div key={integration.id} className="queue-item">
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: integration.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {integration.icon}
                </div>
                <div className="queue-body">
                  <div className="queue-action">{integration.name}</div>
                  <div className="queue-meta">{integration.meta}</div>
                </div>
                <span className={`badge ${connected ? "badge-success" : "badge-neutral"}`} style={{ marginRight: "12px" }}>
                  {connected ? "Connected" : "Not connected"}
                </span>
                <button className="btn btn-ghost btn-sm">
                  {connected ? "Disconnect" : "Connect"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent imports */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent imports</div>
          <button className="btn btn-ghost btn-sm">View all</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Type</th>
              <th>Records</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {importSessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="td-muted" style={{ textAlign: "center", padding: "24px" }}>
                  No imports yet.
                </td>
              </tr>
            ) : (
              importSessions.slice(0, 10).map((session) => (
                <tr key={session.id}>
                  <td className="td-primary">{session.file_name || session.source_name || "—"}</td>
                  <td className="td-muted">{getRecordTypeLabel(session.record_type)}</td>
                  <td className="td-muted">{session.total_rows ?? "—"} records</td>
                  <td className="td-muted">{formatImportDate(session.committed_at || session.created_at)}</td>
                  <td><span className={sessionStatusBadge(session.status)}>{sessionStatusLabel(session)}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
