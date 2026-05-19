import Link from "next/link";
import { CsvImportSessionFlow } from "@/app/imports/CsvImportSessionFlow";
import { GoogleSheetsImportFlow } from "@/app/imports/GoogleSheetsImportFlow";
import { disconnectIntegrationAction } from "@/features/settings/actions";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { ImportsPageData } from "../queries";

type Props = ImportsPageData & { profile: IndustryProfile };

const SYNC_PROVIDER_NAMES: Record<string, string> = {
  stripe: "Stripe",
  hubspot: "HubSpot",
  jobber: "Jobber",
  quickbooks: "QuickBooks",
  square: "Square",
};

const SYNC_SOURCE_TYPES = new Set(Object.keys(SYNC_PROVIDER_NAMES));

function formatImportDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatSyncTime(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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
  if (session.status === "cancelled") return "Cancelled";
  if (session.status === "failed") return "Failed";
  if (session.status === "ready") return "Ready to review";
  if (session.error_rows && session.error_rows > 0) return `${session.error_rows} errors`;
  return session.status || "—";
}

const INTEGRATIONS = [
  {
    id: "quickbooks",
    name: "QuickBooks",
    meta: "Sync customers, invoices, and revenue",
    startHref: "/api/integrations/quickbooks/start",
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
    startHref: "/api/integrations/jobber/start",
    iconBg: "#e0e7ff",
    iconStroke: "#3730a3",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3730a3" strokeWidth={1.8} strokeLinecap="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 12h20"/>
      </svg>
    ),
  },
  {
    id: "hubspot",
    name: "HubSpot",
    meta: "Sync contacts and deal activity",
    startHref: "/api/integrations/hubspot/start",
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
    startHref: "/api/integrations/square/start",
    iconBg: "#f1f5f9",
    iconStroke: "#334155",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth={1.8} strokeLinecap="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
];

export function ImportsView({ importSessions, integrations, syncRuns }: Props) {
  const connectedIds = new Set(integrations.map((i) => i.provider?.toLowerCase()));
  const googleConnected = integrations.some((i) =>
    String(i.provider ?? "").toLowerCase().includes("google"),
  );

  const syncSessions = importSessions.filter((s) => SYNC_SOURCE_TYPES.has(s.source_type ?? ""));
  const manualSessions = importSessions.filter((s) => !SYNC_SOURCE_TYPES.has(s.source_type ?? ""));

  // Build a map from session_id → session for quick lookup
  const sessionById = new Map(syncSessions.map((s) => [s.id, s]));

  return (
    <div style={{ padding: "28px 28px 40px" }}>
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
              <div className="card-desc">Import from a spreadsheet</div>
            </div>
          </div>
          <div className="card-body">
            {googleConnected ? (
              <GoogleSheetsImportFlow />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-ud-muted">
                  Connect your Google account to pick a spreadsheet and import data directly.
                </p>
                <Link
                  href="/api/integrations/google/start"
                  className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-ud-ink px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  Connect Google Sheets
                </Link>
              </div>
            )}
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
                {connected ? (
                  <form action={disconnectIntegrationAction.bind(null, integration.id)}>
                    <button type="submit" className="btn btn-ghost btn-sm">Disconnect</button>
                  </form>
                ) : (
                  <Link href={integration.startHref} className="btn btn-ghost btn-sm">Connect</Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent syncs */}
      {syncRuns.length > 0 && (
        <div className="card mb-5">
          <div className="card-header">
            <div className="card-title">Recent syncs</div>
            <div className="card-desc">What was staged from your connected integrations</div>
          </div>
          <div>
            {syncRuns.slice(0, 6).map((run) => {
              const meta = (run.metadata ?? {}) as Record<string, unknown>;
              const provider = typeof meta.provider === "string" ? meta.provider : "";
              const providerName = SYNC_PROVIDER_NAMES[provider] ?? provider ?? "Integration";
              const sessionIds = Array.isArray(meta.session_ids) ? (meta.session_ids as string[]) : [];
              const linkedSessions = sessionIds.map((id) => sessionById.get(id)).filter(Boolean);
              const isError = run.status === "error" || run.status === "failed";
              const hasRecords = (run.records_seen ?? 0) > 0;

              return (
                <div key={run.id} className="queue-item" style={{ alignItems: "flex-start", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                    <div style={{ flex: 1 }}>
                      <div className="queue-action">{providerName} sync</div>
                      <div className="queue-meta">{formatSyncTime(run.started_at)}</div>
                    </div>
                    <span className={`badge ${isError ? "badge-danger" : hasRecords ? "badge-success" : "badge-neutral"}`}>
                      {isError ? "Failed" : hasRecords ? `${run.records_seen} staged` : "Nothing new"}
                    </span>
                  </div>

                  {isError && run.error_message && (
                    <p style={{ fontSize: "12px", color: "var(--color-danger)", margin: 0 }}>{run.error_message}</p>
                  )}

                  {!isError && (
                    <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--color-muted)" }}>
                      {(run.records_created ?? 0) > 0 && (
                        <span>{run.records_created} created</span>
                      )}
                      {(run.records_updated ?? 0) > 0 && (
                        <span>{run.records_updated} updated</span>
                      )}
                      {linkedSessions.length > 0 && (
                        <span style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          Review:
                          {linkedSessions.map((session) => session && (
                            <Link
                              key={session.id}
                              href={`/imports/sessions/${session.id}`}
                              style={{ color: "var(--color-accent)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "2px" }}
                            >
                              {getRecordTypeLabel(session.record_type)} ({session.total_rows ?? 0})
                            </Link>
                          ))}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent manual imports */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent imports</div>
        </div>
        <div className="table-wrap" style={{ border: "none", borderRadius: 0, boxShadow: "none" }}>
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
              {manualSessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="td-muted" style={{ textAlign: "center", padding: "24px" }}>
                    No imports yet.
                  </td>
                </tr>
              ) : (
                manualSessions.slice(0, 10).map((session) => (
                  <tr key={session.id} style={{ cursor: "pointer" }}>
                    <td className="td-primary">
                      <Link href={`/imports/sessions/${session.id}`} style={{ display: "block" }}>
                        {session.file_name || session.source_name || "—"}
                      </Link>
                    </td>
                    <td className="td-muted">{getRecordTypeLabel(session.record_type)}</td>
                    <td className="td-muted">{session.total_rows ?? "—"} records</td>
                    <td className="td-muted">{formatImportDate(session.committed_at || session.created_at)}</td>
                    <td>
                      <Link href={`/imports/sessions/${session.id}`}>
                        <span className={sessionStatusBadge(session.status)}>{sessionStatusLabel(session)}</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
