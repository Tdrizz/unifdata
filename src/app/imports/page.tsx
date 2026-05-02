import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CsvImportSessionFlow } from "./CsvImportSessionFlow";
import { GoogleSheetsImportFlow } from "./GoogleSheetsImportFlow";

function formatDate(date: string | null) {
  if (!date) return "—";
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

  return "neutral" as const;
}

function getRecordTypeLabel(recordType: string) {
  const labels: Record<string, string> = {
    relationships: "Relationships",
    opportunities: "Opportunities",
    work: "Work",
    revenue: "Revenue",
    actions: "Actions",
  };

  return labels[recordType] || recordType;
}

function getSourceLabel(sourceType: string) {
  const labels: Record<string, string> = {
    csv: "CSV",
    google_sheets: "Google Sheets",
    quickbooks: "QuickBooks",
    stripe: "Stripe",
    square: "Square",
  };

  return labels[sourceType] || sourceType;
}

export default async function ImportsPage() {
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
    importsResult,
    customersResult,
    syncConnectionsResult,
    syncRunsResult,
    importSessionsResult,
    integrationsResult,
  ] = await Promise.all([
    supabase
      .from("imports")
      .select("id, file_name, import_type, status, records_created, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("customers")
      .select("id, name, phone, email, address, customer_type, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("sync_connections")
      .select(
        "id, name, source_type, source_name, record_type, sync_frequency, status, last_sync_at, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("sync_runs")
      .select(
        "id, status, records_seen, records_created, records_updated, records_failed, error_message, started_at, finished_at, metadata",
      )
      .eq("company_id", company.id)
      .order("started_at", { ascending: false })
      .limit(5),

    supabase
      .from("import_sessions")
      .select(
        "id, source_type, source_name, file_name, record_type, status, total_rows, valid_rows, duplicate_rows, error_rows, created_rows, updated_rows, skipped_rows, created_at, committed_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(6),

    supabase
      .from("integrations")
      .select("id, provider, provider_account_name, status, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),
  ]);

  if (importsResult.error) throw new Error(importsResult.error.message);
  if (customersResult.error) throw new Error(customersResult.error.message);
  if (syncConnectionsResult.error) {
    throw new Error(syncConnectionsResult.error.message);
  }
  if (syncRunsResult.error) throw new Error(syncRunsResult.error.message);
  if (importSessionsResult.error) {
    throw new Error(importSessionsResult.error.message);
  }
  if (integrationsResult.error)
    throw new Error(integrationsResult.error.message);

  const importRecords = importsResult.data || [];
  const customerRecords = customersResult.data || [];
  const connectionRecords = syncConnectionsResult.data || [];
  const syncRunRecords = syncRunsResult.data || [];
  const importSessionRecords = importSessionsResult.data || [];
  const integrationRecords = integrationsResult.data || [];

  const googleSheetsIntegration = integrationRecords.find(
    (integration) =>
      integration.provider === "google_sheets" &&
      integration.status === "active",
  );

  const completedImports = importRecords.filter(
    (item) => item.status === "completed",
  ).length;

  const totalImportedRecords = importRecords.reduce(
    (sum, item) => sum + Number(item.records_created || 0),
    0,
  );

  const openReviewSessions = importSessionRecords.filter(
    (session) => session.status === "ready" || session.status === "analyzing",
  ).length;

  const missingContact = customerRecords.filter(
    (customer) => !customer.phone && !customer.email,
  ).length;

  const missingAddress = customerRecords.filter(
    (customer) => !customer.address,
  ).length;

  const dataHealthIssues = missingContact + missingAddress;

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Import"
          title="Bring data into FrontierOps"
          description="Upload CSV files or choose a Google Sheet, review the rows, fix issues, and commit clean records."
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Committed imports"
            value={completedImports}
            helper={`${totalImportedRecords} records created`}
            tone={completedImports > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Open reviews"
            value={openReviewSessions}
            helper="Waiting for review"
            tone={openReviewSessions > 0 ? "warning" : "default"}
          />

          <StatCard
            label="Sources"
            value={integrationRecords.length}
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
          description="Pick a source. FrontierOps stages everything for review before writing to the workspace."
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
                    FrontierOps only imports sheets you choose.
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
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
          {" "}
          <SectionCard
            title="Import reviews"
            description="Review staged imports before they change your workspace."
          >
            {importSessionRecords.length === 0 ? (
              <EmptyState
                title="No import reviews yet"
                description="Upload a CSV or analyze a Google Sheet to create your first review."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {importSessionRecords.map((session) => (
                  <article
                    key={session.id}
                    className="grid gap-3 p-4 md:grid-cols-[1fr_120px_160px_110px]"
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
                        {session.total_rows}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Review
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {session.valid_rows} ready · {session.duplicate_rows}{" "}
                        dupes · {session.error_rows} errors
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
                        Review
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
          <SectionCard
            title="Data quality"
            description={`Quick checks across ${profile.labels.customerPlural.toLowerCase()}.`}
          >
            <div className="grid gap-3 p-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  {profile.labels.customerPlural}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {customerRecords.length}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Total records in the workspace.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">No contact</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {missingContact}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Missing phone and email.
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
        </div>

        {connectionRecords.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.8fr_1.2fr] items-start">
            <SectionCard
              title="Saved syncs"
              description="Connections configured for repeat syncing."
            >
              <div className="divide-y divide-slate-100">
                {connectionRecords.map((connection) => (
                  <article
                    key={connection.id}
                    className="grid gap-3 p-4 md:grid-cols-[1fr_120px_120px_120px]"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {connection.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {connection.source_name || connection.source_type}
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
              title="Recent activity"
              description="Latest import and sync runs."
            >
              {syncRunRecords.length === 0 ? (
                <EmptyState
                  title="No import activity yet"
                  description="Analyze and commit data to create activity history."
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {syncRunRecords.map((run) => {
                    const metadata = run.metadata as {
                      source_type?: string;
                      file_name?: string;
                      record_type?: string;
                    };

                    return (
                      <article
                        key={run.id}
                        className="grid gap-3 p-4 md:grid-cols-[1fr_90px_90px_120px]"
                      >
                        <div>
                          <p className="line-clamp-1 font-semibold text-slate-950">
                            {metadata?.file_name ||
                              getSourceLabel(metadata?.source_type || "") ||
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
                            {run.records_created}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">Updated</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {run.records_updated}
                          </p>
                        </div>

                        <div className="md:text-right">
                          <StatusBadge tone={getStatusTone(run.status)}>
                            {run.status}
                          </StatusBadge>
                          <p className="mt-2 text-xs text-slate-500">
                            {formatDate(run.finished_at || run.started_at)}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        ) : (
          <SectionCard
            title="Recent activity"
            description="Latest import and sync runs."
          >
            {syncRunRecords.length === 0 ? (
              <EmptyState
                title="No import activity yet"
                description="Analyze and commit data to create activity history."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {syncRunRecords.map((run) => {
                  const metadata = run.metadata as {
                    source_type?: string;
                    file_name?: string;
                    record_type?: string;
                  };

                  return (
                    <article
                      key={run.id}
                      className="grid gap-3 p-4 md:grid-cols-[1fr_90px_90px_120px]"
                    >
                      <div>
                        <p className="line-clamp-1 font-semibold text-slate-950">
                          {metadata?.file_name ||
                            getSourceLabel(metadata?.source_type || "") ||
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
                          {run.records_created}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Updated</p>
                        <p className="text-sm font-semibold text-slate-700">
                          {run.records_updated}
                        </p>
                      </div>

                      <div className="md:text-right">
                        <StatusBadge tone={getStatusTone(run.status)}>
                          {run.status}
                        </StatusBadge>
                        <p className="mt-2 text-xs text-slate-500">
                          {formatDate(run.finished_at || run.started_at)}
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
    </AppShell>
  );
}
