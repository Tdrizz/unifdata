import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DismissError } from "@/components/ui/DismissError";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { formatTimestampDate } from "@/lib/date-format";
import { getFormString } from "@/lib/utils";
import { getIndustryProfile } from "@/lib/industry-profiles";

type CustomerRecord = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  customer_type: string | null;
  notes: string | null;
  created_at: string;
};

function getPrimaryContact(customer: CustomerRecord) {
  if (customer.email && customer.phone) {
    return `${customer.email} · ${customer.phone}`;
  }

  if (customer.email) {
    return customer.email;
  }

  if (customer.phone) {
    return customer.phone;
  }

  return "No contact saved";
}

function getContactIssue(customer: {
  phone: string | null;
  email: string | null;
}) {
  const missingPhone = !customer.phone;
  const missingEmail = !customer.email;

  if (missingPhone && missingEmail) {
    return "Missing phone and email";
  }

  if (missingPhone) {
    return "Missing phone";
  }

  if (missingEmail) {
    return "Missing email";
  }

  return "Contact complete";
}

function getContactTone(customer: {
  phone: string | null;
  email: string | null;
}) {
  return customer.phone && customer.email ? "success" : "warning";
}

function getCustomerType(customer: CustomerRecord) {
  return customer.customer_type || "No type set";
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorParam } = await searchParams;
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

  async function createCustomer(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const currentCompany = await getCurrentCompany();

    if (!currentCompany) {
      redirect("/onboarding");
    }

    const { company } = currentCompany;

    const name = getFormString(formData, "name");
    const phone = getFormString(formData, "phone");
    const email = getFormString(formData, "email");
    const address = getFormString(formData, "address");
    const customerType = getFormString(formData, "customer_type");
    const notes = getFormString(formData, "notes");

    if (!name) {
      redirect("/customers?error=Name+is+required.");
    }

    const { error } = await supabase.from("customers").insert({
      company_id: company.id,
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      customer_type: customerType || null,
      notes: notes || null,
    });

    if (error) {
      redirect(`/customers?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/customers");
    revalidatePath("/workspace");
    redirect("/customers");
  }

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, email, address, customer_type, notes, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    throw new Error(error.message);
  }

  const customers = (data || []) as CustomerRecord[];

  const missingEmail = customers.filter((customer) => !customer.email);
  const missingPhone = customers.filter((customer) => !customer.phone);
  const missingAddress = customers.filter((customer) => !customer.address);
  const recordsNeedingCleanup = customers.filter(
    (customer) => !customer.email || !customer.phone || !customer.address,
  ).length;

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
      businessSector={company.business_sector}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow={profile.labels.customerPlural}
          title={`${profile.labels.customerPlural} and businesses`}
          description={`Manage ${profile.labels.customerSingular.toLowerCase()} records and quickly see which contact fields are missing.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/workspace"
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-3 py-2 text-[13px] font-semibold text-ud-muted hover:text-ud-ink"
              >
                Home
              </Link>

              <Link
                href="/leads"
                className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#4A3FA8] px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90"
              >
                {profile.labels.leadPlural}
              </Link>
            </div>
          }
        />

        <section className="rounded-[12px] border border-[rgba(23,22,20,0.08)] bg-ud-surface shadow-[0_1px_0_rgba(23,22,20,0.04),0_1px_2px_rgba(23,22,20,0.03)]">
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ud-muted">
                Directory overview
              </p>

              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ud-ink">
                {customers.length} {profile.labels.customerPlural.toLowerCase()} in your workspace
              </h2>

              <p className="mt-2 text-[13.5px] leading-[1.6] text-ud-muted">
                {recordsNeedingCleanup > 0
                  ? `${recordsNeedingCleanup} record${recordsNeedingCleanup === 1 ? "" : "s"} need contact or address cleanup.`
                  : "All current records have complete contact and address details."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="neutral">{customers.length} total</StatusBadge>

              <StatusBadge
                tone={missingEmail.length > 0 ? "warning" : "success"}
              >
                {missingEmail.length} missing email
              </StatusBadge>

              <StatusBadge
                tone={missingPhone.length > 0 ? "warning" : "success"}
              >
                {missingPhone.length} missing phone
              </StatusBadge>

              <StatusBadge
                tone={missingAddress.length > 0 ? "warning" : "success"}
              >
                {missingAddress.length} missing address
              </StatusBadge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px border-t border-[rgba(23,22,20,0.08)] bg-[rgba(23,22,20,0.06)] sm:grid-cols-4">
            {[
              {
                label: profile.labels.customerPlural,
                value: customers.length,
                helper: "Saved records",
              },
              {
                label: "Need email",
                value: missingEmail.length,
                helper: "Missing email",
              },
              {
                label: "Need phone",
                value: missingPhone.length,
                helper: "Missing phone",
              },
              {
                label: "Need address",
                value: missingAddress.length,
                helper: "Missing address",
              },
            ].map((item) => (
              <div key={item.label} className="bg-ud-surface p-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ud-muted">
                  {item.label}
                </p>

                <p className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ud-ink">
                  {item.value}
                </p>

                <p className="mt-1 text-[13px] text-ud-muted">{item.helper}</p>
              </div>
            ))}
          </div>
        </section>

        <details className="group rounded-[12px] border border-[rgba(23,22,20,0.08)] bg-ud-surface shadow-[0_1px_0_rgba(23,22,20,0.04),0_1px_2px_rgba(23,22,20,0.03)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
            <div>
              <p className="text-[13.5px] font-semibold text-ud-ink">
                Add {profile.labels.customerSingular.toLowerCase()} or business
              </p>
              <p className="mt-1 text-[13px] text-ud-muted">
                Add a record manually without leaving the {profile.labels.customerPlural} page.
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-3 py-2 text-[13px] font-semibold text-ud-muted hover:text-ud-ink group-open:hidden">
              Open
            </span>

            <span className="hidden items-center gap-1.5 rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-3 py-2 text-[13px] font-semibold text-ud-muted hover:text-ud-ink group-open:inline-flex">
              Close
            </span>
          </summary>

          <form
            action={createCustomer}
            className="space-y-4 border-t border-[rgba(23,22,20,0.05)] p-5"
          >
            {errorParam && <DismissError message={errorParam} />}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-ud-muted">
                Name
                <input
                  name="name"
                  required
                  placeholder="John Smith, ABC Flooring, Ocean View Home..."
                  className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                />
              </label>

              <label className="text-sm font-medium text-ud-muted">
                Type
                <input
                  name="customer_type"
                  placeholder="Customer, lead, residential, commercial..."
                  className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-ud-muted">
                Phone
                <input
                  name="phone"
                  placeholder="808-555-1234"
                  className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                />
              </label>

              <label className="text-sm font-medium text-ud-muted">
                Email
                <input
                  name="email"
                  type="email"
                  placeholder="customer@example.com"
                  className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-ud-muted">
              Address
              <input
                name="address"
                placeholder="Service address, city, or area"
                className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
              />
            </label>

            <label className="block text-sm font-medium text-ud-muted">
              Notes
              <textarea
                name="notes"
                rows={3}
                placeholder="Preferences, project details, or follow-up context..."
                className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#4A3FA8] px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90"
              >
                Add {profile.labels.customerSingular.toLowerCase()}
              </button>
            </div>
          </form>
        </details>

        <SectionCard
          title="Directory"
          description={`Open a record to edit contact details, address, type, or notes.`}
        >
          {customers.length === 0 ? (
            <EmptyState
              title={`No ${profile.labels.customerPlural.toLowerCase()} yet`}
              description={`Add a ${profile.labels.customerSingular.toLowerCase()} manually or import from CSV or Google Sheets.`}
            />
          ) : (
            <div>
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center gap-3.5 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 hover:bg-ud-surface-soft transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-ud-ink truncate">
                      {customer.name || `Unnamed ${profile.labels.customerSingular.toLowerCase()}`}
                    </p>
                    <p className="text-[12px] text-ud-muted mt-0.5 truncate">
                      {getPrimaryContact(customer)}
                      {customer.address ? ` · ${customer.address}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge tone={getContactTone(customer)}>
                      {getContactIssue(customer)}
                    </StatusBadge>
                    <span className="text-[12px] text-ud-muted hidden sm:block">
                      {getCustomerType(customer)}
                    </span>
                    <span className="text-[11px] text-ud-muted hidden md:block">
                      {formatTimestampDate(customer.created_at)}
                    </span>
                    <Link
                      href={`/customers/${customer.id}/edit`}
                      className="text-[12px] font-semibold text-[#4A3FA8] hover:underline"
                    >
                      Open →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
