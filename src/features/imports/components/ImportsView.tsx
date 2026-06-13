"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { CsvImportSessionFlow } from "@/app/imports/CsvImportSessionFlow";
import { GoogleSheetsImportFlow } from "@/app/imports/GoogleSheetsImportFlow";
import { ColumnMapper } from "@/features/imports/components/ColumnMapper";
import { SyncNowButton } from "@/components/ui/SyncNowButton";
import { disconnectIntegrationAction } from "@/features/settings/actions";
import { getIndustryProfile } from "@/lib/industry-profiles";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { useProfile } from "@/lib/profile-context";
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

function formatImportDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatSyncTime(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function getRecordTypeLabel(rt: string | null, profile?: IndustryProfile) {
  const p = profile ?? getIndustryProfile();
  const map: Record<string, string> = {
    relationships: p.labels.customerPlural,
    opportunities: p.labels.leadPlural,
    work: p.labels.jobPlural,
    revenue: p.labels.salePlural,
    actions: p.labels.followUpPlural,
  };
  return map[rt || ""] || rt || "Records";
}

function getRecordTypes(profile?: IndustryProfile): { value: ImportRecordType; label: string }[] {
  const p = profile ?? getIndustryProfile();
  return [
    { value: "relationships", label: "Relationships" },
    { value: "opportunities", label: p.labels.leadPlural },
    { value: "work", label: p.labels.jobPlural },
    { value: "revenue", label: p.labels.salePlural },
    { value: "actions", label: p.labels.followUpPlural },
  ];
}

function sessionStatusBadge(status: string | null) {
  const base = "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold";
  const s = (status || "").toLowerCase();
  if (s === "committed") return `${base} bg-ud-success-bg text-ud-success`;
  if (s === "failed" || s === "error") return `${base} bg-ud-danger-bg text-ud-danger`;
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

function isConnected(integration: { status: string | null } | undefined) {
  const s = String(integration?.status || "").toLowerCase();
  return s.includes("active") || s.includes("connected");
}


function PublicSheetsFlow() {
  const router = useRouter();
  const profile = useProfile();
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
            {getRecordTypes(profile).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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

export function ImportsView({ importSessions, integrations, syncRuns, profile }: Props) {
  const googleConnected = integrations.some((i) =>
    String(i.provider ?? "").toLowerCase().includes("google"),
  );

  const googleIntegration = integrations.find((i) =>
    String(i.provider || "").toLowerCase().includes("google"),
  );
  const quickbooksIntegration = integrations.find((i) => i.provider === "quickbooks");
  const squareIntegration = integrations.find((i) => i.provider === "square");
  const hubspotIntegration = integrations.find((i) => i.provider === "hubspot");
  const jobberIntegration = integrations.find((i) => i.provider === "jobber");
  const stripeIntegration = integrations.find((i) => i.provider === "stripe");

  const integrationRows = [
    { provider: "quickbooks", label: "QuickBooks", desc: "Sync customers, invoices, and revenue", integration: quickbooksIntegration, startHref: "/api/integrations/quickbooks/start" },
    { provider: "google_sheets", label: "Google Sheets", desc: "Used for bulk imports below", integration: googleIntegration, startHref: "/api/integrations/google/start" },
    { provider: "jobber", label: "Jobber", desc: "Sync jobs, quotes, and field schedules", integration: jobberIntegration, startHref: "/api/integrations/jobber/start" },
    // HubSpot and Stripe are hidden for new connections but stay manageable
    // where already connected.
    ...(hubspotIntegration
      ? [{ provider: "hubspot", label: "HubSpot", desc: "Sync contacts and deal activity", integration: hubspotIntegration, startHref: "/api/integrations/hubspot/start" }]
      : []),
    ...(stripeIntegration
      ? [{ provider: "stripe", label: "Stripe", desc: "Sync customers and payment records", integration: stripeIntegration, startHref: "/api/integrations/stripe/start" }]
      : []),
    { provider: "square", label: "Square", desc: "Import payments, invoices, and customer records", integration: squareIntegration, startHref: "/api/integrations/square/start" },
  ];

  // Most recent sync run per provider (syncRuns arrive ordered newest-first)
  const lastSyncByProvider: Record<string, string> = {};
  for (const run of syncRuns) {
    const meta = (run.metadata ?? {}) as Record<string, unknown>;
    const provider = typeof meta.provider === "string" ? meta.provider : "";
    if (provider && run.started_at && !lastSyncByProvider[provider]) {
      lastSyncByProvider[provider] = run.started_at;
    }
  }

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
    if (isError) return `${base} bg-ud-danger-bg text-ud-danger`;
    if (hasRecords) return `${base} bg-ud-success-bg text-ud-success`;
    return `${base} bg-ud-surface-sunk text-ud-muted`;
  };

  return (
    <>
    <div className="md:hidden flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-12 h-12 rounded-[14px] bg-ud-surface border border-ud flex items-center justify-center mb-4">
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="text-ud-muted">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <p className="text-[15px] font-semibold text-ud-ink mb-1">Import data</p>
      <p className="text-[13px] text-ud-muted max-w-[240px]">Use a desktop browser to import contacts, jobs, or revenue from CSV or Google Sheets.</p>
    </div>
    <div className="hidden md:block px-8 pt-7 pb-12">
      <PageHeader
        eyebrow="Imports"
        title="Import data"
        description="Bring in clients, jobs, or revenue from a CSV or Google Sheets."
        className="mb-6"
      />

      {/* Connected sources */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ud-ink">Connected sources</h2>
            <p className="text-[12.5px] text-ud-muted mt-0.5">Sync data automatically from your existing tools.</p>
          </div>
        </div>
        <div className="bg-ud-surface border border-ud rounded-[12px] overflow-hidden">
          {integrationRows.map(({ provider, label, desc, integration, startHref }) => {
            const connected = isConnected(integration);
            const lastSync = lastSyncByProvider[provider];
            return (
              <div key={provider} className={queueItem}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-ud-ink">{label}</p>
                    <span className={badgePill(connected)}>
                      {connected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <p className="text-[12px] text-ud-muted mt-[1px]">{desc}</p>
                  {(integration?.provider_account_name || lastSync) && (
                    <p className="text-[11px] text-ud-faint mt-0.5">
                      {integration?.provider_account_name}
                      {integration?.provider_account_name && lastSync && " · "}
                      {lastSync && <>Last synced {formatSyncTime(lastSync)}</>}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {connected && integration?.status === "active" && (
                    <SyncNowButton provider={provider} label={label} />
                  )}
                  {connected ? (
                    <form action={disconnectIntegrationAction.bind(null, provider)}>
                      <Button type="submit" variant="secondary" size="sm">Disconnect</Button>
                    </form>
                  ) : (
                    <Link href={startHref} className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-[color,border-color] duration-[120ms]">Connect</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
                        const label = getRecordTypeLabel(session.record_type, profile);
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
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted">{getRecordTypeLabel(session.record_type, profile)}</td>
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
    </>
  );
}
