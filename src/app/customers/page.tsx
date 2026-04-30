import Link from "next/link";
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

async function createCustomerAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const customerType = String(formData.get("customerType") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!name) {
    throw new Error("Name is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("customers").insert({
    company_id: companyId,
    name,
    phone: phone || null,
    email: email || null,
    address: address || null,
    customer_type: customerType || null,
    notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/customers");
  revalidatePath("/workspace");
  revalidatePath("/data-hub");
}

async function deleteCustomerAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const customerId = String(formData.get("customerId") || "");

  if (!customerId) {
    throw new Error("Customer ID is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/customers");
  revalidatePath("/workspace");
  revalidatePath("/data-hub");
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString();
}

function getCompletenessStatus(customer: {
  phone: string | null;
  email: string | null;
  address: string | null;
}) {
  const hasContact = Boolean(customer.phone || customer.email);
  const hasAddress = Boolean(customer.address);

  if (hasContact && hasAddress) {
    return {
      label: "Complete",
      tone: "success" as const,
    };
  }

  if (hasContact || hasAddress) {
    return {
      label: "Partial",
      tone: "warning" as const,
    };
  }

  return {
    label: "Needs info",
    tone: "danger" as const,
  };
}

export default async function CustomersPage() {
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

  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, phone, email, address, customer_type, notes, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const customerRecords = customers || [];

  const totalCustomers = customerRecords.length;

  const missingContact = customerRecords.filter(
    (customer) => !customer.phone && !customer.email,
  ).length;

  const missingAddress = customerRecords.filter(
    (customer) => !customer.address,
  ).length;

  const completeRecords = customerRecords.filter(
    (customer) =>
      Boolean(customer.phone || customer.email) && Boolean(customer.address),
  ).length;

  const recentCustomers = customerRecords.slice(0, 5);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Records"
          title={profile.labels.customerPlural}
          description={`Store and organize ${profile.labels.customerPlural.toLowerCase()}, contact details, addresses, notes, and relationship context in one clean record system.`}
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={`Total ${profile.labels.customerPlural.toLowerCase()}`}
            value={totalCustomers}
            helper="Stored relationship records"
          />

          <StatCard
            label="Complete records"
            value={completeRecords}
            helper="Have contact info and address"
            tone="positive"
          />

          <StatCard
            label="Missing contact"
            value={missingContact}
            helper="No phone or email"
            tone={missingContact > 0 ? "warning" : "default"}
          />

          <StatCard
            label="Missing address"
            value={missingAddress}
            helper="No address on file"
            tone={missingAddress > 0 ? "warning" : "default"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.75fr_1.25fr]">
          <SectionCard
            title={`Add ${profile.labels.customerSingular.toLowerCase()}`}
            description="Create a clean record that can connect to opportunities, work, revenue, and follow-ups."
          >
            <form action={createCustomerAction} className="space-y-4 p-5">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  name="name"
                  required
                  placeholder={`${profile.labels.customerSingular} name`}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Phone
                  </label>
                  <input
                    name="phone"
                    placeholder="907-555-1234"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Address
                </label>
                <input
                  name="address"
                  placeholder="Service address, office address, or mailing address"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Type
                </label>
                <input
                  name="customerType"
                  placeholder="Residential, Commercial, New Patient, Client, Prospect..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Important relationship context, preferences, service notes, or follow-up details..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Save {profile.labels.customerSingular.toLowerCase()}
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Record quality"
            description="A quick view of whether customer data is complete enough to support follow-ups, reporting, and AI summaries."
          >
            <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">Complete</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {completeRecords}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Records with contact info and address.
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
                  Harder to follow up without phone or email.
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
                  Address helps with routing, service context, and local data.
                </p>
              </div>
            </div>

            {recentCustomers.length > 0 && (
              <div className="border-t border-slate-100 p-5">
                <p className="text-sm font-semibold text-slate-950">
                  Recently added
                </p>

                <div className="mt-4 space-y-3">
                  {recentCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {customer.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {customer.email ||
                            customer.phone ||
                            "No contact info"}
                        </p>
                      </div>

                      <StatusBadge tone={getCompletenessStatus(customer).tone}>
                        {getCompletenessStatus(customer).label}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        </section>

        <SectionCard
          title={`${profile.labels.customerPlural} records`}
          description="Clean contact records that connect the rest of the business system together."
        >
          {customerRecords.length === 0 ? (
            <EmptyState
              title={`No ${profile.labels.customerPlural.toLowerCase()} yet`}
              description={`Add your first ${profile.labels.customerSingular.toLowerCase()} or import a list to begin building the business data layer.`}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {customerRecords.map((customer) => {
                const completeness = getCompletenessStatus(customer);

                return (
                  <article
                    key={customer.id}
                    className="grid gap-4 p-5 md:grid-cols-[1.2fr_1fr_1fr_120px_90px]"
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
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {customer.phone || "No phone"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {customer.email || "No email"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Address
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {customer.address || "No address"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Status
                      </p>
                      <div className="mt-2">
                        <StatusBadge tone={completeness.tone}>
                          {completeness.label}
                        </StatusBadge>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Added {formatDate(customer.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Link
                        href={`/customers/${customer.id}/edit`}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </Link>

                      <form action={deleteCustomerAction}>
                        <input
                          type="hidden"
                          name="customerId"
                          value={customer.id}
                        />
                        <button className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
                          Delete
                        </button>
                      </form>
                    </div>

                    {customer.notes && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-5">
                        <p className="text-xs font-medium text-slate-500">
                          Notes
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          {customer.notes}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
