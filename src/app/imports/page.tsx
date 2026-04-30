import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany, getCurrentCompanyId } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

type ParsedRow = Record<string, string>;

const expectedCustomerColumns = [
  "name",
  "phone",
  "email",
  "address",
  "customer_type",
  "notes",
];

const providerCards = [
  {
    name: "CSV Upload",
    status: "Available",
    description:
      "Import relationship data from spreadsheets, exports, and manual business lists.",
    detail: "Best for first-time setup and quick data migration.",
    tone: "success" as const,
  },
  {
    name: "Google Sheets",
    status: "Next",
    description:
      "Connect a spreadsheet, map columns once, and sync updated rows into FrontierOps.",
    detail: "Planned as the first read-only automated sync.",
    tone: "warning" as const,
  },
  {
    name: "QuickBooks",
    status: "Planned",
    description:
      "Pull customers, invoices, payments, and unpaid balances into the revenue layer.",
    detail: "Read-only first. No accounting writes until much later.",
    tone: "neutral" as const,
  },
  {
    name: "Stripe / Square",
    status: "Planned",
    description:
      "Bring payment activity into FrontierOps so revenue and collections stay visible.",
    detail: "Useful for businesses already taking digital payments.",
    tone: "neutral" as const,
  },
];

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());

  return values;
}

function parseCsv(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      headers: lines[0] ? parseCsvLine(lines[0]) : [],
      rows: [] as ParsedRow[],
    };
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.trim().toLowerCase(),
  );

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: ParsedRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || "";
    });

    return row;
  });

  return {
    headers,
    rows,
  };
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleString();
}

function getStatusTone(status: string | null) {
  if (status === "completed" || status === "active") {
    return "success" as const;
  }

  if (status === "failed") {
    return "danger" as const;
  }

  if (status === "pending") {
    return "warning" as const;
  }

  return "neutral" as const;
}

async function importCustomersAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const uploadedFile = formData.get("csvFile");

  if (!uploadedFile || typeof uploadedFile === "string") {
    throw new Error("Please upload a CSV file.");
  }

  const file = uploadedFile as File;
  const text = await file.text();

  const { headers, rows } = parseCsv(text);

  if (rows.length === 0) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  if (!headers.includes("name")) {
    throw new Error("CSV must include a name column.");
  }

  const validRows = rows
    .map((row) => ({
      company_id: companyId,
      name: row.name?.trim(),
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      address: row.address?.trim() || null,
      customer_type: row.customer_type?.trim() || null,
      notes: row.notes?.trim() || null,
    }))
    .filter((row) => Boolean(row.name));

  if (validRows.length === 0) {
    throw new Error("No valid relationship rows found. Each row needs a name.");
  }

  const supabase = await createClient();

  const { error: customerError } = await supabase
    .from("customers")
    .insert(validRows);

  if (customerError) {
    throw new Error(customerError.message);
  }

  const { error: importError } = await supabase.from("imports").insert({
    company_id: companyId,
    file_name: file.name || "relationship-import.csv",
    import_type: "relationships",
    status: "completed",
    records_created: validRows.length,
  });

  if (importError) {
    throw new Error(importError.message);
  }

  const { error: syncRunError } = await supabase.from("sync_runs").insert({
    company_id: companyId,
    sync_connection_id: null,
    status: "completed",
    records_seen: rows.length,
    records_created: validRows.length,
    records_updated: 0,
    records_failed: rows.length - validRows.length,
    finished_at: new Date().toISOString(),
    metadata: {
      source_type: "csv",
      file_name: file.name || "relationship-import.csv",
      record_type: "relationships",
      headers,
    },
  });

  if (syncRunError) {
    throw new Error(syncRunError.message);
  }

  revalidatePath("/imports");
  revalidatePath("/customers");
  revalidatePath("/workspace");
  revalidatePath("/data-hub");
  revalidatePath("/ai-assistant");
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

  const { data: imports, error: importsError } = await supabase
    .from("imports")
    .select("id, file_name, import_type, status, records_created, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (importsError) {
    throw new Error(importsError.message);
  }

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name, phone, email, address, customer_type, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (customersError) {
    throw new Error(customersError.message);
  }

  const { data: syncConnections, error: syncConnectionsError } = await supabase
    .from("sync_connections")
    .select(
      "id, name, source_type, source_name, record_type, sync_frequency, status, last_sync_at, created_at",
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (syncConnectionsError) {
    throw new Error(syncConnectionsError.message);
  }

  const { data: syncRuns, error: syncRunsError } = await supabase
    .from("sync_runs")
    .select(
      "id, status, records_seen, records_created, records_updated, records_failed, error_message, started_at, finished_at, metadata",
    )
    .eq("company_id", company.id)
    .order("started_at", { ascending: false })
    .limit(12);

  if (syncRunsError) {
    throw new Error(syncRunsError.message);
  }

  const importRecords = imports || [];
  const customerRecords = customers || [];
  const connectionRecords = syncConnections || [];
  const syncRunRecords = syncRuns || [];

  const totalImports = importRecords.length;

  const totalImportedRecords = importRecords.reduce(
    (sum, item) => sum + Number(item.records_created || 0),
    0,
  );

  const completedImports = importRecords.filter(
    (item) => item.status === "completed",
  ).length;

  const failedRuns = syncRunRecords.filter(
    (item) => item.status === "failed",
  ).length;

  const totalSyncedRecords = syncRunRecords.reduce(
    (sum, run) =>
      sum + Number(run.records_created || 0) + Number(run.records_updated || 0),
    0,
  );

  const missingContact = customerRecords.filter(
    (customer) => !customer.phone && !customer.email,
  ).length;

  const missingAddress = customerRecords.filter(
    (customer) => !customer.address,
  ).length;

  const recentCustomers = customerRecords.slice(0, 6);

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
          description="Bring business data into FrontierOps from spreadsheets, exports, and eventually connected tools. The goal is to reduce manual entry and turn scattered data into a usable operating view."
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Imports completed"
            value={completedImports}
            helper={`${totalImports} total import attempts`}
            tone={completedImports > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Records imported"
            value={totalImportedRecords}
            helper="Created through CSV imports"
          />

          <StatCard
            label="Synced records"
            value={totalSyncedRecords}
            helper="Created or updated through sync runs"
            tone={totalSyncedRecords > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Sync issues"
            value={failedRuns}
            helper="Failed sync attempts"
            tone={failedRuns > 0 ? "danger" : "default"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <SectionCard
            title="Import relationships from CSV"
            description={`Upload a CSV to create ${profile.labels.customerPlural.toLowerCase()} from an existing spreadsheet or export.`}
          >
            <form action={importCustomersAction} className="space-y-5 p-5">
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <label className="text-sm font-medium text-slate-700">
                  CSV file
                </label>

                <input
                  name="csvFile"
                  type="file"
                  accept=".csv,text/csv"
                  required
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                />

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Best for customer lists exported from spreadsheets, old CRMs,
                  booking systems, or business management tools.
                </p>
              </div>

              <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Import relationship records
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Sync roadmap"
            description="FrontierOps will start with safe read-only syncs before any two-way updates."
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

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard
            title="CSV template"
            description="Current CSV imports support relationship data. Mapping for other record types comes next."
          >
            <div className="p-5">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white text-xs uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        {expectedCustomerColumns.map((column) => (
                          <th key={column} className="px-4 py-3 font-semibold">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-950">
                          Mike Johnson
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          808-555-0110
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          mike@example.com
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          Kailua-Kona, HI
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          Residential
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          Interested in monthly service
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                name,phone,email,address,customer_type,notes
                {"\n"}
                Mike Johnson,808-555-0110,mike@example.com,Kailua-Kona
                HI,Residential,Interested in monthly service
              </pre>
            </div>
          </SectionCard>

          <SectionCard
            title="Import quality"
            description="After data comes in, FrontierOps shows what still needs cleanup."
          >
            <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">
                  Relationship records
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {customerRecords.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Total stored people or company records.
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
            description="Every import and future sync should create a traceable run history."
          >
            {syncRunRecords.length === 0 ? (
              <EmptyState
                title="No sync activity yet"
                description="Upload a CSV to create the first sync run history record."
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
          description="A record of CSV migrations performed for this workspace."
        >
          {importRecords.length === 0 ? (
            <EmptyState
              title="No imports yet"
              description="Upload your first CSV to start moving business data into FrontierOps."
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
