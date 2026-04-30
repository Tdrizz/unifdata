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

function getImportTone(status: string | null) {
  if (status === "completed") {
    return "success" as const;
  }

  if (status === "failed") {
    return "danger" as const;
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
    throw new Error("No valid customer rows found. Each row needs a name.");
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
    file_name: file.name || "customer-import.csv",
    import_type: "customers",
    status: "completed",
    records_created: validRows.length,
  });

  if (importError) {
    throw new Error(importError.message);
  }

  revalidatePath("/imports");
  revalidatePath("/customers");
  revalidatePath("/workspace");
  revalidatePath("/data-hub");
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

  const importRecords = imports || [];
  const customerRecords = customers || [];

  const totalImports = importRecords.length;

  const totalImportedRecords = importRecords.reduce(
    (sum, item) => sum + Number(item.records_created || 0),
    0,
  );

  const completedImports = importRecords.filter(
    (item) => item.status === "completed",
  ).length;

  const failedImports = importRecords.filter(
    (item) => item.status === "failed",
  ).length;

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
          eyebrow="Data"
          title="Data Migration"
          description="Bring messy customer lists into FrontierOps, clean the records, and turn scattered spreadsheet data into a usable business system."
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Imports completed"
            value={completedImports}
            helper={`${totalImports} total import attempts`}
            tone={completedImports > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Records created"
            value={totalImportedRecords}
            helper="Total records added through imports"
          />

          <StatCard
            label="Missing contact"
            value={missingContact}
            helper="Imported records with no phone or email"
            tone={missingContact > 0 ? "warning" : "default"}
          />

          <StatCard
            label="Failed imports"
            value={failedImports}
            helper="Imports that need review"
            tone={failedImports > 0 ? "danger" : "default"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.75fr_1.25fr]">
          <SectionCard
            title={`Import ${profile.labels.customerPlural.toLowerCase()}`}
            description="Upload a CSV customer list and FrontierOps will create clean customer records."
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
                  bookkeeping tools, or local business software.
                </p>
              </div>

              <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Import customer records
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="CSV template"
            description="Use this format for the cleanest import."
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
                          907-555-1234
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          mike@example.com
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          123 Main St
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          Residential
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          Asked about spring service
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-950">
                  Required column
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Only{" "}
                  <span className="font-semibold text-slate-950">name</span> is
                  required. The other columns are optional but improve data
                  quality and reporting.
                </p>

                <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                  name,phone,email,address,customer_type,notes
                  {"\n"}
                  Mike Johnson,907-555-1234,mike@example.com,123 Main
                  St,Residential,Asked about spring service
                </pre>
              </div>
            </div>
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard
            title="Import quality"
            description="After data comes in, FrontierOps shows what still needs cleanup."
          >
            <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">
                  Customer records
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {customerRecords.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Total stored customer records.
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
                  No service or mailing address.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Recently added records"
            description="Newest customer records currently stored in the workspace."
          >
            {recentCustomers.length === 0 ? (
              <EmptyState
                title="No customer records yet"
                description="Import a CSV or add customers manually to start building the data layer."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_140px]"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {customer.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {customer.customer_type || "No type set"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Contact
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {customer.email || customer.phone || "No contact info"}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-xs font-medium text-slate-500">
                        Added
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {formatDate(customer.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <SectionCard
          title="Import history"
          description="A record of data migrations performed for this workspace."
        >
          {importRecords.length === 0 ? (
            <EmptyState
              title="No imports yet"
              description="Upload your first CSV to start migrating business data into FrontierOps."
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
                      <StatusBadge tone={getImportTone(item.status)}>
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
