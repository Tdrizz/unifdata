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
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Home
              </Link>

              <Link
                href="/leads"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {profile.labels.leadPlural}
              </Link>
            </div>
          }
        />

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Directory overview
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {customers.length} {profile.labels.customerPlural.toLowerCase()} in your workspace
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
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

          <div className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-4">
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
              <div key={item.label} className="bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  {item.label}
                </p>

                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {item.value}
                </p>

                <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
              </div>
            ))}
          </div>
        </section>

        <details className="group rounded-3xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Add {profile.labels.customerSingular.toLowerCase()} or business
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Add a record manually without leaving the {profile.labels.customerPlural} page.
              </p>
            </div>

            <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 group-open:hidden">
              Open
            </span>

            <span className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 group-open:inline-flex">
              Close
            </span>
          </summary>

          <form
            action={createCustomer}
            className="space-y-4 border-t border-slate-100 p-5"
          >
            {errorParam && <DismissError message={errorParam} />}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Name
                <input
                  name="name"
                  required
                  placeholder="John Smith, ABC Flooring, Ocean View Home..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Type
                <input
                  name="customer_type"
                  placeholder="Customer, lead, residential, commercial..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Phone
                <input
                  name="phone"
                  placeholder="808-555-1234"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Email
                <input
                  name="email"
                  type="email"
                  placeholder="customer@example.com"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Address
              <input
                name="address"
                placeholder="Service address, city, or area"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Notes
              <textarea
                name="notes"
                rows={3}
                placeholder="Preferences, project details, or follow-up context..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
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
            <div className="divide-y divide-slate-100">
              {customers.map((customer) => (
                <article
                  key={customer.id}
                  className="grid gap-4 p-4 md:grid-cols-[1.25fr_0.8fr_0.7fr_90px] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">
                        {customer.name || `Unnamed ${profile.labels.customerSingular.toLowerCase()}`}
                      </p>

                      <StatusBadge tone={getContactTone(customer)}>
                        {getContactIssue(customer)}
                      </StatusBadge>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {getPrimaryContact(customer)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {!customer.address && (
                        <StatusBadge tone="neutral">
                          Missing address
                        </StatusBadge>
                      )}

                      {!customer.customer_type && (
                        <StatusBadge tone="neutral">Missing type</StatusBadge>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Address
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-700">
                      {customer.address || "No address saved"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Type</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {getCustomerType(customer)}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      Added {formatTimestampDate(customer.created_at)}
                    </p>
                  </div>

                  <div className="md:text-right">
                    <Link
                      href={`/customers/${customer.id}/edit`}
                      className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Open
                    </Link>
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

