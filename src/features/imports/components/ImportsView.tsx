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
import type { Json } from "@/types/db";
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Import"
        title="Bring data into UnifData"
        description="Upload CSV files or choose a Google Sheet, review the rows, fix issues, and commit clean records."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/data-hub"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Data Hub
            </Link>

            <Link
              href="/workspace"
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Home
            </Link>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">CSV upload</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Use exports from spreadsheets, old CRMs, or management
                  tools.
                </p>
              </div>

              <StatusBadge tone="success">Ready</StatusBadge>
            </div>

            <CsvImportSessionFlow />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">Google Sheets</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
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
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
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
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-950">
                  Connect Google to import sheets.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  UnifData only imports sheets you choose.
                </p>

                <a
                  href="/api/integrations/google/start"
                  className="mt-4 inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
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
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {getSourceLabel(integration.provider)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
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
            <div className="divide-y divide-slate-100">
              {reviewSessions.map((session) => (
                <article
                  key={session.id}
                  className="grid gap-3 p-4 md:grid-cols-[1fr_120px_160px_110px] md:items-center"
                >
                  <div>
                    <p className="line-clamp-1 font-semibold text-slate-950">
                      {session.file_name ||
                        session.source_name ||
                        "Import review"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {getSourceLabel(session.source_type)} ·{" "}
                      {getRecordTypeLabel(session.record_type)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Rows</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {session.total_rows || 0}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Review
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
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
                      className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                {profile.labels.customerPlural}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {customers.length}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Total records in the workspace.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Incomplete contact</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {missingContact}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Missing phone or email.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">No address</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {missingAddress}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
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
          <div className="divide-y divide-slate-100">
            {committedSessions.map((session) => (
              <article
                key={session.id}
                className="grid gap-3 p-4 md:grid-cols-[1fr_120px_160px_140px] md:items-center"
              >
                <div>
                  <p className="line-clamp-1 font-semibold text-slate-950">
                    {session.file_name ||
                      session.source_name ||
                      "Import"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {getSourceLabel(session.source_type)} ·{" "}
                    {getRecordTypeLabel(session.record_type)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">Records</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {Number(session.created_rows || 0) + Number(session.updated_rows || 0)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">Committed</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
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
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
            <div className="divide-y divide-slate-100">
              {syncConnections.map((connection) => (
                <article
                  key={connection.id}
                  className="grid gap-3 p-4 md:grid-cols-[1fr_120px_120px_120px] md:items-center"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {connection.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {connection.source_name ||
                        getSourceLabel(connection.source_type)}
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-slate-700">
                    {getRecordTypeLabel(connection.record_type)}
                  </p>

                  <p className="text-sm font-semibold text-slate-700">
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
              <div className="divide-y divide-slate-100">
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
                        <p className="line-clamp-1 font-semibold text-slate-950">
                          {metadata?.file_name ||
                            getSourceLabel(metadata?.source_type || null) ||
                            "Import run"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {getRecordTypeLabel(
                            metadata?.record_type || "records",
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Created</p>
                        <p className="text-sm font-semibold text-slate-700">
                          {run.records_created || 0}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Updated</p>
                        <p className="text-sm font-semibold text-slate-700">
                          {run.records_updated || 0}
                        </p>
                      </div>

                      <div className="md:text-right">
                        <StatusBadge tone={getStatusTone(run.status)}>
                          {run.status}
                        </StatusBadge>
                        <p className="mt-2 text-xs text-slate-500">
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
            <div className="divide-y divide-slate-100">
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
                      <p className="line-clamp-1 font-semibold text-slate-950">
                        {metadata?.file_name ||
                          getSourceLabel(metadata?.source_type || null) ||
                          "Import run"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {getRecordTypeLabel(
                          metadata?.record_type || "records",
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Created</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {run.records_created || 0}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Updated</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {run.records_updated || 0}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <StatusBadge tone={getStatusTone(run.status)}>
                        {run.status}
                      </StatusBadge>
                      <p className="mt-2 text-xs text-slate-500">
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
