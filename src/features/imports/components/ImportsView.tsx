import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SyncNowButton } from "@/components/ui/SyncNowButton";
import { CsvImportSessionFlow } from "@/app/imports/CsvImportSessionFlow";
import { GoogleSheetsImportFlow } from "@/app/imports/GoogleSheetsImportFlow";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { ImportsPageData } from "../queries";
import { revertImportSession } from "../actions";

function formatTimestamp(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleString();
}

function getStatusTone(status: string | null) {
  if (status === "completed" || status === "active" || status === "committed") {
    return "success" as const;
  }

  if (status === "failed" || status === "error") {
    return "danger" as const;
  }

  if (
    status === "pending" ||
    status === "ready" ||
    status === "analyzing" ||
    status === "draft"
  ) {
    return "warning" as const;
  }

  if (status === "cancelled") {
    return "neutral" as const;
  }

  return "neutral" as const;
}

function getRecordTypeLabel(recordType: string | null) {
  const labels: Record<string, string> = {
    relationships: "People",
    opportunities: "Opportunities",
    work: "Work",
    revenue: "Revenue",
    actions: "Follow-ups",
  };

  return labels[recordType || ""] || recordType || "Records";
}

function getSourceLabel(sourceType: string | null) {
  const labels: Record<string, string> = {
    csv: "CSV",
    google_sheets: "Google Sheets",
    quickbooks: "QuickBooks",
    square: "Square",
    hubspot: "HubSpot",
    jobber: "Jobber",
    stripe: "Stripe",
  };

  return labels[sourceType || ""] || sourceType || "Source";
}

function getStatusLabel(status: string | null) {
  const text = String(status || "").replace(/_/g, " ").trim();
  if (!text) return "Not connected";
  return text.replace(/\b\w/g, (l) => l.toUpperCase());
}

function isReviewStatus(status: string | null) {
  return (
    status === "draft" ||
    status === "analyzing" ||
    status === "ready" ||
    status === "failed"
  );
}

type Props = ImportsPageData & { profile: IndustryProfile };

export function ImportsView({
  customers,
  syncConnections,
  syncRuns,
  importSessions,
  integrations,
  profile,
}: Props) {
  const googleSheetsIntegration = integrations.find(
    (integration) =>
      integration.provider === "google_sheets" &&
      integration.status === "active",
  );

  const reviewSessions = importSessions.filter((session) =>
    isReviewStatus(session.status),
  );

  const committedSessions = importSessions.filter(
    (session) => session.status === "committed" || session.status === "reverted",
  );

  const completedImports = committedSessions.length;

  const totalImportedRecords = committedSessions.reduce(
    (sum, session) =>
      sum +
      Number(session.created_rows || 0) +
      Number(session.updated_rows || 0),
    0,
  );

  const openReviewSessions = reviewSessions.filter(
    (session) => session.status === "ready" || session.status === "analyzing",
  ).length;

  const missingContact = customers.filter(
    (customer) => !customer.phone || !customer.email,
  ).length;

  const missingAddress = customers.filter(
    (customer) => !customer.address,
  ).length;

  const dataHealthIssues = missingContact + missingAddress;

  return (
    <div className="space-y-5 px-4 md:px-6 pt-5 pb-8">
      <PageHeader
        eyebrow="Import"
        title="Bring data into UnifData"
        description="Upload CSV files or choose a Google Sheet, review the rows, fix issues, and commit clean records."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/data-hub"
              className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk"
            >
              Data Hub
            </Link>

            <Link
              href="/workspace"
              className="rounded-[10px] bg-ud-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Home
            </Link>
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Committed imports"
          value={completedImports}
          helper={`${totalImportedRecords} records created or updated`}
          tone={completedImports > 0 ? "positive" : "default"}
        />

        <StatCard
          label="Needs review"
          value={openReviewSessions}
          helper="Imports not yet committed"
          tone={openReviewSessions > 0 ? "warning" : "default"}
        />

        <StatCard
          label="Sources"
          value={integrations.length}
          helper={googleSheetsIntegration ? "Google connected" : "CSV only"}
          tone={googleSheetsIntegration ? "positive" : "default"}
        />

        <StatCard
          label="Data issues"
          value={dataHealthIssues}
          helper="Missing contact or address"
          tone={dataHealthIssues > 0 ? "warning" : "default"}
        />
      </section>

      <SectionCard
        title="Add data"
        description="Pick a source. UnifData stages everything for review before writing to the workspace."
      >
        <div className="grid gap-4 p-4 xl:grid-cols-2">
          <div className="rounded-[14px] border border-ud bg-ud-surface-sunk p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ud-ink">CSV upload</p>
                <p className="mt-1 text-sm leading-6 text-ud-muted">
                  Use exports from spreadsheets, old CRMs, or management
                  tools.
                </p>
              </div>

              <StatusBadge tone="success">Ready</StatusBadge>
            </div>

            <CsvImportSessionFlow />
          </div>

          <div className="rounded-[14px] border border-ud bg-ud-surface-sunk p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ud-ink">Google Sheets</p>
                <p className="mt-1 text-sm leading-6 text-ud-muted">
                  Choose a sheet, select a tab, and review rows before commit.
                </p>
              </div>

              <StatusBadge
                tone={googleSheetsIntegration ? "success" : "warning"}
              >
                {googleSheetsIntegration ? "Connected" : "Connect"}
              </StatusBadge>
            </div>

            {googleSheetsIntegration ? (
              <div className="space-y-3">
                <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Connected account
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-950">
                    {googleSheetsIntegration.provider_account_name ||
                      "Google account"}
                  </p>
                </div>

                <GoogleSheetsImportFlow />
              </div>
            ) : (
              <div className="rounded-[10px] border border-ud bg-ud-surface p-4">
                <p className="text-sm font-semibold text-ud-ink">
                  Connect Google to import sheets.
                </p>
                <p className="mt-2 text-sm leading-6 text-ud-muted">
                  UnifData only imports sheets you choose.
                </p>

                <a
                  href="/api/integrations/google/start"
                  className="mt-4 inline-flex rounded-[10px] bg-ud-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  Connect Google
                </a>
              </div>
            )}
          </div>

          {integrations
            .filter((i) =>
              ["quickbooks", "hubspot", "jobber", "square", "stripe"].includes(
                i.provider ?? "",
              ),
            )
            .map((integration) => (
              <div
                key={integration.id}
                className="rounded-[14px] border border-ud bg-ud-surface-sunk p-4"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ud-ink">
                      {getSourceLabel(integration.provider)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-ud-muted">
                      Sync your connected account data into UnifData for
                      review.
                    </p>
                  </div>
                  <StatusBadge tone={getStatusTone(integration.status)}>
                    {getStatusLabel(integration.status)}
                  </StatusBadge>
                </div>
                <SyncNowButton
                  provider={integration.provider!}
                  label={getSourceLabel(integration.provider)}
                />
              </div>
            ))}
        </div>
      </SectionCard>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
        <SectionCard
          title="Needs review"
          description="Imports waiting for edits, duplicate decisions, or final commit."
        >
          {reviewSessions.length === 0 ? (
            <EmptyState
              title="Nothing waiting for review"
              description="Upload a CSV or choose a Google Sheet to start a new import."
            />
          ) : (
            <div className="divide-y divide-ud">
              {reviewSessions.map((session) => (
                <article
                  key={session.id}
                  className="grid gap-3 p-4 md:grid-cols-[1fr_120px_160px_110px] md:items-center"
                >
                  <div>
                    <p className="line-clamp-1 font-semibold text-ud-ink">
                      {session.file_name ||
                        session.source_name ||
                        "Import review"}
                    </p>
                    <p className="mt-1 text-sm text-ud-faint">
                      {getSourceLabel(session.source_type)} ·{" "}
                      {getRecordTypeLabel(session.record_type)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-ud-faint">Rows</p>
                    <p className="mt-1 text-sm font-semibold text-ud-muted">
                      {session.total_rows || 0}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-ud-faint">
                      Review
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ud-muted">
                      {session.valid_rows || 0} ready ·{" "}
                      {session.duplicate_rows || 0} dupes ·{" "}
                      {session.error_rows || 0} errors
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <StatusBadge tone={getStatusTone(session.status)}>
                      {session.status}
                    </StatusBadge>

                    <Link
                      href={`/imports/sessions/${session.id}`}
                      className="w-fit rounded-xl border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-ud-surface-sunk"
                    >
                      Open review
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Data quality"
          description={`Missing details across ${profile.labels.customerPlural.toLowerCase()}.`}
        >
          <div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4">
              <p className="text-xs font-medium text-ud-faint">
                {profile.labels.customerPlural}
              </p>
              <p className="mt-2 text-2xl font-semibold text-ud-ink">
                {customers.length}
              </p>
              <p className="mt-2 text-xs leading-5 text-ud-faint">
                Total records in the workspace.
              </p>
            </div>

            <div className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4">
              <p className="text-xs font-medium text-ud-faint">Incomplete contact</p>
              <p className="mt-2 text-2xl font-semibold text-ud-ink">
                {missingContact}
              </p>
              <p className="mt-2 text-xs leading-5 text-ud-faint">
                Missing phone or email.
              </p>
            </div>

            <div className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4">
              <p className="text-xs font-medium text-ud-faint">No address</p>
              <p className="mt-2 text-2xl font-semibold text-ud-ink">
                {missingAddress}
              </p>
              <p className="mt-2 text-xs leading-5 text-ud-faint">
                Missing address or location.
              </p>
            </div>
          </div>
        </SectionCard>
      </section>

      {committedSessions.length > 0 && (
        <SectionCard
          title="Committed imports"
          description="Imports that have been committed to the workspace. Use Revert to undo a specific import."
        >
          <div className="divide-y divide-ud">
            {committedSessions.map((session) => (
              <article
                key={session.id}
                className="grid gap-3 p-4 md:grid-cols-[1fr_120px_160px_140px] md:items-center"
              >
                <div>
                  <p className="line-clamp-1 font-semibold text-ud-ink">
                    {session.file_name ||
                      session.source_name ||
                      "Import"}
                  </p>
                  <p className="mt-1 text-sm text-ud-faint">
                    {getSourceLabel(session.source_type)} ·{" "}
                    {getRecordTypeLabel(session.record_type)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-ud-faint">Records</p>
                  <p className="mt-1 text-sm font-semibold text-ud-muted">
                    {Number(session.created_rows || 0) + Number(session.updated_rows || 0)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-ud-faint">Committed</p>
                  <p className="mt-1 text-sm font-semibold text-ud-muted">
                    {formatTimestamp(session.committed_at || session.created_at)}
                  </p>
                </div>

                <div className="flex flex-col gap-2 md:items-end">
                  <StatusBadge tone={getStatusTone(session.status)}>
                    {session.status}
                  </StatusBadge>

                  <form action={revertImportSession.bind(null, session.id)}>
                    <button
                      type="submit"
                      disabled={session.status === "reverted"}
                      className="rounded-lg border border-ud px-2 py-1 text-xs text-ud-muted hover:bg-ud-surface-sunk disabled:opacity-50"
                    >
                      {session.status === "reverted" ? "Reverted" : "Revert"}
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      )}

      {syncConnections.length > 0 ? (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.8fr_1.2fr] items-start">
          <SectionCard
            title="Saved syncs"
            description="Connections configured for repeat syncing."
          >
            <div className="divide-y divide-ud">
              {syncConnections.map((connection) => (
                <article
                  key={connection.id}
                  className="grid gap-3 p-4 md:grid-cols-[1fr_120px_120px_120px] md:items-center"
                >
                  <div>
                    <p className="font-semibold text-ud-ink">
                      {connection.name}
                    </p>
                    <p className="mt-1 text-sm text-ud-faint">
                      {connection.source_name ||
                        getSourceLabel(connection.source_type)}
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-ud-muted">
                    {getRecordTypeLabel(connection.record_type)}
                  </p>

                  <p className="text-sm font-semibold text-ud-muted">
                    {connection.sync_frequency}
                  </p>

                  <div className="md:text-right">
                    <StatusBadge tone={getStatusTone(connection.status)}>
                      {connection.status}
                    </StatusBadge>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Import history"
            description="Committed imports and sync runs for this workspace."
          >
            {syncRuns.length === 0 ? (
              <EmptyState
                title="No committed imports yet"
                description="Import and commit data to create history here."
              />
            ) : (
              <div className="divide-y divide-ud">
                {syncRuns.map((run) => {
                  const metadata = run.metadata as {
                    source_type?: string;
                    file_name?: string;
                    record_type?: string;
                  } | null;

                  return (
                    <article
                      key={run.id}
                      className="grid gap-3 p-4 md:grid-cols-[1fr_90px_90px_120px] md:items-center"
                    >
                      <div>
                        <p className="line-clamp-1 font-semibold text-ud-ink">
                          {metadata?.file_name ||
                            getSourceLabel(metadata?.source_type || null) ||
                            "Import run"}
                        </p>
                        <p className="mt-1 text-sm text-ud-faint">
                          {getRecordTypeLabel(
                            metadata?.record_type || "records",
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-ud-faint">Created</p>
                        <p className="text-sm font-semibold text-ud-muted">
                          {run.records_created || 0}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-ud-faint">Updated</p>
                        <p className="text-sm font-semibold text-ud-muted">
                          {run.records_updated || 0}
                        </p>
                      </div>

                      <div className="md:text-right">
                        <StatusBadge tone={getStatusTone(run.status)}>
                          {run.status}
                        </StatusBadge>
                        <p className="mt-2 text-xs text-ud-faint">
                          {formatTimestamp(run.finished_at || run.started_at)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </section>
      ) : (
        <SectionCard
          title="Recent activity"
          description="Latest import and sync runs."
        >
          {syncRuns.length === 0 ? (
            <EmptyState
              title="No import activity yet"
              description="Analyze and commit data to create activity history."
            />
          ) : (
            <div className="divide-y divide-ud">
              {syncRuns.map((run) => {
                const metadata = run.metadata as {
                  source_type?: string;
                  file_name?: string;
                  record_type?: string;
                } | null;

                return (
                  <article
                    key={run.id}
                    className="grid gap-3 p-4 md:grid-cols-[1fr_90px_90px_120px] md:items-center"
                  >
                    <div>
                      <p className="line-clamp-1 font-semibold text-ud-ink">
                        {metadata?.file_name ||
                          getSourceLabel(metadata?.source_type || null) ||
                          "Import run"}
                      </p>
                      <p className="mt-1 text-sm text-ud-faint">
                        {getRecordTypeLabel(
                          metadata?.record_type || "records",
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-ud-faint">Created</p>
                      <p className="text-sm font-semibold text-ud-muted">
                        {run.records_created || 0}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-ud-faint">Updated</p>
                      <p className="text-sm font-semibold text-ud-muted">
                        {run.records_updated || 0}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <StatusBadge tone={getStatusTone(run.status)}>
                        {run.status}
                      </StatusBadge>
                      <p className="mt-2 text-xs text-ud-faint">
                        {formatTimestamp(run.finished_at || run.started_at)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
