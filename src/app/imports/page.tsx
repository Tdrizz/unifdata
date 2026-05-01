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

const providerCards = [
  {
    name: "CSV Upload",
    status: "Available",
    description:
      "Upload exported data, analyze rows, detect duplicates, review errors, and commit clean records.",
    detail: "Best for onboarding and one-time data migrations.",
    tone: "success" as const,
  },
  {
    name: "Google Sheets",
    status: "Next",
    description:
      "Connect a spreadsheet, choose a tab, and sync rows through the same import engine.",
    detail: "Planned as the first read-only automated sync.",
    tone: "warning" as const,
  },
  {
    name: "QuickBooks",
    status: "Planned",
    description:
      "Pull customers, invoices, payments, and unpaid balances into FrontierOps.",
    detail: "Read-only first. No accounting writes until much later.",
    tone: "neutral" as const,
  },
  {
    name: "Stripe / Square",
    status: "Planned",
    description:
      "Bring payment activity into the revenue layer for cleaner collection tracking.",
    detail: "Useful for businesses taking digital payments.",
    tone: "neutral" as const,
  },
];

function formatDate(date: string | null) {
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

  if (status === "pending" || status === "ready" || status === "analyzing") {
    return "warning" as const;
  }

  return "neutral" as const;
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
      .limit(12),

    supabase
      .from("import_sessions")
      .select(
        "id, source_type, source_name, file_name, record_type, status, total_rows, valid_rows, duplicate_rows, error_rows, created_rows, updated_rows, skipped_rows, created_at, committed_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (importsResult.error) {
    throw new Error(importsResult.error.message);
  }

  if (customersResult.error) {
    throw new Error(customersResult.error.message);
  }

  if (syncConnectionsResult.error) {
    throw new Error(syncConnectionsResult.error.message);
  }

  if (syncRunsResult.error) {
    throw new Error(syncRunsResult.error.message);
  }

  if (importSessionsResult.error) {
    throw new Error(importSessionsResult.error.message);
  }

  const importRecords = importsResult.data || [];
  const customerRecords = customersResult.data || [];
  const connectionRecords = syncConnectionsResult.data || [];
  const syncRunRecords = syncRunsResult.data || [];
  const importSessionRecords = importSessionsResult.data || [];

  const completedImports = importRecords.filter(
    (item) => item.status === "completed",
  ).length;

  const totalImportedRecords = importRecords.reduce(
    (sum, item) => sum + Number(item.records_created || 0),
    0,
  );

  const activeSessions = importSessionRecords.filter(
    (session) => session.status === "ready" || session.status === "analyzing",
  ).length;

  const failedRuns = syncRunRecords.filter(
    (item) => item.status === "failed",
  ).length;

  const missingContact = customerRecords.filter(
    (customer) => !customer.phone && !customer.email,
  ).length;

  const missingAddress = customerRecords.filter(
    (customer) => !customer.address,
  ).length;

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Import & Sync"
          title="Data Sources"
          description="Bring business data into FrontierOps from CSV files today, then connect spreadsheets and business systems through the same staged sync engine."
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Imports completed"
            value={completedImports}
            helper={`${importRecords.length} total import attempts`}
            tone={completedImports > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Records imported"
            value={totalImportedRecords}
            helper="Committed into FrontierOps"
          />

          <StatCard
            label="Active sessions"
            value={activeSessions}
            helper="Ready or currently analyzing"
            tone={activeSessions > 0 ? "warning" : "default"}
          />

          <StatCard
            label="Sync issues"
            value={failedRuns}
            helper="Failed sync attempts"
            tone={failedRuns > 0 ? "danger" : "default"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <SectionCard
            title="Import CSV"
            description="Upload exported data, let FrontierOps analyze the rows, then commit only the clean records."
          >
            <div className="p-5">
              <CsvImportSessionFlow />
            </div>
          </SectionCard>

          <SectionCard
            title="Sync roadmap"
            description="CSV is available now. Connected sources will use the same import session pipeline."
          >
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              {providerCards.map((provider) => (
                <div
                  key={provider.name}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {provider.name}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {provider.description}
                      </p>
                    </div>

                    <StatusBadge tone={provider.tone}>
                      {provider.status}
                    </StatusBadge>
                  </div>

                  <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-xs font-medium leading-5 text-slate-500">
                    {provider.detail}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard
            title="Import sessions"
            description="Every upload is staged before it is committed, so duplicates and errors can be reviewed first."
          >
            {importSessionRecords.length === 0 ? (
              <EmptyState
                title="No import sessions yet"
                description="Upload a CSV to create the first staged import session."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {importSessionRecords.map((session) => (
                  <article
                    key={session.id}
                    className="grid gap-4 p-5 md:grid-cols-[1fr_130px_150px_130px]"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {session.file_name ||
                          session.source_name ||
                          "Import session"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {session.record_type} · {session.source_type}
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

                    <div className="md:text-right">
                      <StatusBadge tone={getStatusTone(session.status)}>
                        {session.status}
                      </StatusBadge>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatDate(session.committed_at || session.created_at)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Import quality"
            description="Imported data is checked for missing details that affect reporting."
          >
            <div className="grid grid-cols-1 divide-y divide-slate-100">
              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">
                  {profile.labels.customerPlural}
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {customerRecords.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Total people, company, client, or patient records.
                </p>
              </div>

              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">
                  Missing contact
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {missingContact}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  No phone or email on file.
                </p>
              </div>

              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">
                  Missing address
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {missingAddress}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  No service, mailing, or business address.
                </p>
              </div>
            </div>
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard
            title="Saved sync connections"
            description="Future automated syncs will appear here after a source is connected and mapped."
          >
            {connectionRecords.length === 0 ? (
              <EmptyState
                title="No sync connections yet"
                description="CSV import is available now. Google Sheets and connected source syncs will use this area next."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {connectionRecords.map((connection) => (
                  <article
                    key={connection.id}
                    className="grid gap-4 p-5 md:grid-cols-[1fr_140px_130px_150px]"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {connection.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {connection.source_name || connection.source_type}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Record type
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {connection.record_type}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Frequency
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {connection.sync_frequency}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <StatusBadge tone={getStatusTone(connection.status)}>
                        {connection.status}
                      </StatusBadge>
                      <p className="mt-2 text-xs text-slate-500">
                        Last sync: {formatDate(connection.last_sync_at)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Recent sync activity"
            description="Every import and future sync creates traceable run history."
          >
            {syncRunRecords.length === 0 ? (
              <EmptyState
                title="No sync activity yet"
                description="Upload and commit a CSV to create the first sync run history record."
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
                      className="grid gap-4 p-5 md:grid-cols-[1fr_130px_130px_160px]"
                    >
                      <div>
                        <p className="font-semibold text-slate-950">
                          {metadata?.file_name ||
                            metadata?.source_type ||
                            "Sync run"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {metadata?.record_type || "records"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Created
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {run.records_created}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Updated
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
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

                      {run.error_message && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 md:col-span-4">
                          {run.error_message}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </section>

        <SectionCard
          title="Import history"
          description="A record of committed imports performed for this workspace."
        >
          {importRecords.length === 0 ? (
            <EmptyState
              title="No committed imports yet"
              description="Upload, analyze, and commit a CSV to create import history."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {importRecords.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 p-5 md:grid-cols-[1fr_160px_140px_170px]"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {item.file_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.import_type} import
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Records created
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {item.records_created}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Status</p>
                    <div className="mt-1">
                      <StatusBadge tone={getStatusTone(item.status)}>
                        {item.status}
                      </StatusBadge>
                    </div>
                  </div>

                  <div className="md:text-right">
                    <p className="text-xs font-medium text-slate-500">
                      Imported
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
