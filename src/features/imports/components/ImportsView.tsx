"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CsvImportSessionFlow } from "@/app/imports/CsvImportSessionFlow";
import { GoogleSheetsImportFlow } from "@/app/imports/GoogleSheetsImportFlow";
import { ColumnMapper } from "@/features/imports/components/ColumnMapper";
import { disconnectIntegrationAction } from "@/features/settings/actions";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { ImportsPageData } from "../queries";
import { PageHeader } from "@/components/ui/PageHeader";
import type { ColumnMapping } from "@/lib/imports/fuzzy-mapper";
import type { ImportRecordType } from "@/lib/import-engine-fields";

type Props = ImportsPageData & { profile: IndustryProfile };

const SYNC_PROVIDER_NAMES: Record<string, string> = {
  stripe: "Stripe",
  hubspot: "HubSpot",
  jobber: "Jobber",
  quickbooks: "QuickBooks",
  square: "Square",
};

const SYNC_SOURCE_TYPES = new Set(Object.keys(SYNC_PROVIDER_NAMES));

const card = "bg-ud-surface border border-[rgba(0,0,0,0.06)] rounded-[var(--radius-ud-lg)] shadow-ud overflow-hidden";
const cardHeader = "px-[22px] py-4 border-b border-[rgba(0,0,0,0.05)]";
const cardTitle = "text-[13.5px] font-semibold text-ud-ink";
const cardDesc = "text-[12px] text-ud-muted mt-0.5";
const queueItem = "flex items-center gap-3.5 px-5 py-[14px] border-b border-[rgba(0,0,0,0.04)] last:border-b-0";
const btnGhostSm = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-[color,border-color] duration-[120ms]";

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
  const base = "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold";
  const s = (status || "").toLowerCase();
  if (s === "committed") return `${base} bg-ud-success-bg text-ud-success`;
  if (s === "failed" || s === "error") return `${base} bg-[#fef2f2] text-ud-danger`;
  if (s === "ready" || s === "draft" || s === "analyzing") return `${base} bg-ud-warning-bg text-ud-warning`;
  return `${base} bg-ud-surface-sunk text-ud-muted`;
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

const RECORD_TYPES: { value: ImportRecordType; label: string }[] = [
  { value: "relationships", label: "Relationships" },
  { value: "opportunities", label: "Opportunities" },
  { value: "work", label: "Work" },
  { value: "revenue", label: "Revenue" },
  { value: "actions", label: "Actions" },
];

function PublicSheetsFlow() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [recordType, setRecordType] = useState<ImportRecordType>("relationships");
  const [step, setStep] = useState<"input" | "mapping">("input");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [message, setMessage] = useState("");

  async function handleFetch() {
    if (!url.trim()) { setMessage("Paste a Google Sheets URL first."); return; }
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/imports/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Could not fetch sheet."); return; }

      const fetchedHeaders: string[] = data.headers ?? [];
      const fetchedRows: Record<string, string>[] = data.rows ?? [];

      // Get AI mapping
      let aiMapping: ColumnMapping = {};
      try {
        const mapRes = await fetch("/api/imports/map-columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headers: fetchedHeaders, recordType, sampleRows: fetchedRows.slice(0, 3) }),
        });
        if (mapRes.ok) {
          const mapData = await mapRes.json();
          aiMapping = mapData.mapping ?? {};
        }
      } catch { /* use empty mapping */ }

      setHeaders(fetchedHeaders);
      setRows(fetchedRows);
      setMapping(aiMapping);
      setStep("mapping");
    } catch {
      setMessage("Something went wrong fetching the sheet.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(confirmedMapping: Record<string, string>) {
    setImporting(true);
    try {
      const res = await fetch("/api/import-sessions/rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows,
          recordType,
          sourceName: "Google Sheets",
          sourceType: "google_sheets",
          mapping: confirmedMapping,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Import failed."); setStep("input"); return; }
      router.push(`/imports/sessions/${data.session_id}`);
    } catch {
      setMessage("Something went wrong.");
      setStep("input");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-3">
      {step === "input" && (
        <>
          <p className="text-sm text-ud-muted">
            Paste a public Google Sheets URL, or{" "}
            <Link href="/api/integrations/google/start" className="font-semibold text-ud-muted underline underline-offset-2 hover:text-ud-ink">
              connect your Google account
            </Link>{" "}
            for private sheets.
          </p>
          <select
            value={recordType}
            onChange={(e) => setRecordType(e.target.value as ImportRecordType)}
            className="w-full rounded-[12px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none"
          >
            {RECORD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setMessage(""); }}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full rounded-[12px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:border-ud-accent focus:ring-2 focus:ring-ud-accent/20"
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={!url.trim() || loading}
            className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-ud-ink px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {loading ? "Fetching…" : "Fetch sheet"}
          </button>
        </>
      )}

      {step === "mapping" && (
        <ColumnMapper
          headers={headers}
          mapping={mapping}
          recordType={recordType}
          onConfirm={handleConfirm}
          onBack={() => setStep("input")}
          busy={importing}
        />
      )}

      {message && (
        <div className="flex items-start justify-between gap-3 rounded-[12px] border border-ud bg-ud-surface p-4">
          <p className="text-sm font-semibold text-ud-muted">{message}</p>
          <button type="button" onClick={() => setMessage("")} className="shrink-0 text-ud-faint hover:text-ud-muted">&times;</button>
        </div>
      )}
    </div>
  );
}

export function ImportsView({ importSessions, integrations, syncRuns }: Props) {
  const connectedIds = new Set(integrations.map((i) => i.provider?.toLowerCase()));
  const googleConnected = integrations.some((i) =>
    String(i.provider ?? "").toLowerCase().includes("google"),
  );

  const syncSessions = importSessions.filter((s) => SYNC_SOURCE_TYPES.has(s.source_type ?? ""));
  const manualSessions = importSessions.filter((s) => !SYNC_SOURCE_TYPES.has(s.source_type ?? ""));

  const sessionById = new Map(syncSessions.map((s) => [s.id, s]));

  const badgePill = (connected: boolean) => {
    const base = "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold";
    return connected
      ? `${base} bg-ud-success-bg text-ud-success`
      : `${base} bg-ud-surface-sunk text-ud-muted`;
  };

  const syncBadge = (isError: boolean, hasRecords: boolean) => {
    const base = "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold";
    if (isError) return `${base} bg-[#fef2f2] text-ud-danger`;
    if (hasRecords) return `${base} bg-ud-success-bg text-ud-success`;
    return `${base} bg-ud-surface-sunk text-ud-muted`;
  };

  return (
    <div className="hidden md:block px-7 pb-10 pt-7">
      <PageHeader
        eyebrow="Imports"
        title="Import data"
        description="Bring in clients, jobs, or revenue from a CSV or Google Sheets."
        className="mb-6"
      />

      {/* Two import cards */}
      <div className="grid grid-cols-2 gap-5 items-start mb-[22px]">
        {/* File upload card */}
        <div className={card}>
          <div className={cardHeader}>
            <p className={cardTitle}>Upload a file</p>
            <p className={cardDesc}>CSV, TSV, Excel, ODS, or Apple Numbers</p>
          </div>
          <div className="p-[18px_20px]">
            <CsvImportSessionFlow />
          </div>
        </div>

        {/* Google Sheets card */}
        <div className={card}>
          <div className={cardHeader}>
            <p className={cardTitle}>Google Sheets</p>
            <p className={cardDesc}>Import from a spreadsheet</p>
          </div>
          <div className="p-[18px_20px]">
            {googleConnected ? (
              <GoogleSheetsImportFlow />
            ) : (
              <PublicSheetsFlow />
            )}
          </div>
        </div>
      </div>

      {/* Sync integrations */}
      <div className={`${card} mb-[22px]`}>
        <div className={cardHeader}>
          <p className={cardTitle}>Sync from integrations</p>
          <p className={cardDesc}>Pull data directly from connected tools — no file needed</p>
        </div>
        <div>
          {INTEGRATIONS.map((integration) => {
            const connected = connectedIds.has(integration.id);
            return (
              <div key={integration.id} className={queueItem}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: integration.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {integration.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-ud-ink">{integration.name}</p>
                  <p className="text-[12px] text-ud-muted mt-[1px]">{integration.meta}</p>
                </div>
                <span className={badgePill(connected)} style={{ marginRight: "12px" }}>
                  {connected ? "Connected" : "Not connected"}
                </span>
                {connected ? (
                  <form action={disconnectIntegrationAction.bind(null, integration.id)}>
                    <button type="submit" className={btnGhostSm}>Disconnect</button>
                  </form>
                ) : (
                  <Link href={integration.startHref} className={btnGhostSm}>Connect</Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent syncs */}
      {syncRuns.length > 0 && (
        <div className={`${card} mb-[22px]`}>
          <div className={cardHeader}>
            <p className={cardTitle}>Recent syncs</p>
            <p className={cardDesc}>What was pulled in from your connected integrations</p>
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

              const pendingSessions = linkedSessions.filter((s) => s && s.status === "ready");
              const committedSessions = linkedSessions.filter((s) => s && s.status === "committed");
              const allSessions = linkedSessions.length > 0 ? linkedSessions : [];

              return (
                <div key={run.id} className={`${queueItem} flex-col gap-[10px] items-start`}>
                  {/* Header row */}
                  <div className="flex items-center gap-[10px] w-full">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-ud-ink">{providerName}</p>
                      <p className="text-[12px] text-ud-muted mt-[1px]">{formatSyncTime(run.started_at)}</p>
                    </div>
                    <span className={syncBadge(isError, hasRecords)}>
                      {isError ? "Failed" : hasRecords ? "Synced" : "Nothing new"}
                    </span>
                  </div>

                  {isError && run.error_message && (
                    <p style={{ fontSize: "12px", color: "var(--ud-danger)", margin: 0 }}>{run.error_message}</p>
                  )}

                  {!isError && allSessions.length > 0 && (
                    <div className="w-full flex flex-col gap-[6px]">
                      {allSessions.map((session) => {
                        if (!session) return null;
                        const label = getRecordTypeLabel(session.record_type);
                        const added = session.created_rows ?? 0;
                        const updated = session.updated_rows ?? 0;
                        const skipped = session.duplicate_rows ?? 0;
                        const needsReview = session.status === "ready";

                        const parts: string[] = [];
                        if (added > 0) parts.push(`${added} added`);
                        if (updated > 0) parts.push(`${updated} updated`);
                        if (skipped > 0) parts.push(`${skipped} skipped`);
                        if (parts.length === 0 && (session.total_rows ?? 0) > 0) parts.push(`${session.total_rows} checked`);

                        return (
                          <div key={session.id} className="flex items-center gap-[10px] text-[12.5px]">
                            <span className="font-semibold text-ud-ink min-w-[90px]">{label}</span>
                            <span className="text-ud-muted flex-1">
                              {parts.length > 0 ? parts.join(" · ") : "No changes"}
                            </span>
                            {needsReview && (
                              <Link
                                href={`/imports/sessions/${session.id}`}
                                className="text-ud-accent font-semibold underline underline-offset-[2px] whitespace-nowrap"
                              >
                                Review →
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isError && allSessions.length === 0 && hasRecords && (
                    <div className="flex gap-4 text-[12px] text-ud-muted">
                      {(run.records_created ?? 0) > 0 && <span>{run.records_created} added</span>}
                      {(run.records_updated ?? 0) > 0 && <span>{run.records_updated} updated</span>}
                      {(run.records_failed ?? 0) > 0 && <span style={{ color: "var(--ud-danger)" }}>{run.records_failed} failed</span>}
                    </div>
                  )}

                  {!isError && pendingSessions.length > 1 && (
                    <p className="text-[12px] text-ud-warning m-0">
                      {pendingSessions.length} record types need review before they&apos;re committed.
                    </p>
                  )}
                  {!isError && committedSessions.length > 0 && pendingSessions.length === 0 && allSessions.length === committedSessions.length && (
                    <p className="text-[12px] text-ud-success m-0">
                      All records committed to your workspace.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent manual imports */}
      <div className={card}>
        <div className={cardHeader}>
          <p className={cardTitle}>Recent imports</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-ud-surface">
            <thead>
              <tr>
                {["File", "Type", "Records", "Date", "Status"].map((h) => (
                  <th key={h} className="px-4 py-[10px] text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint bg-[rgba(0,0,0,0.015)] border-b border-ud whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child_td]:border-b-0 [&_tr:hover_td]:bg-[rgba(0,0,0,0.012)]">
              {manualSessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-[13px] text-ud-muted text-center border-b border-[rgba(0,0,0,0.04)]">
                    No imports yet.
                  </td>
                </tr>
              ) : (
                manualSessions.slice(0, 10).map((session) => (
                  <tr key={session.id} className="cursor-pointer">
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] font-semibold text-ud-ink">
                      <Link href={`/imports/sessions/${session.id}`} className="block">
                        {session.file_name || session.source_name || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted">{getRecordTypeLabel(session.record_type)}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted">{session.total_rows ?? "—"} records</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted">{formatImportDate(session.committed_at || session.created_at)}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]">
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
