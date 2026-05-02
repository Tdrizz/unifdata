import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

type PersonRecord = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  customer_type: string | null;
  notes: string | null;
  created_at: string;
};

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString();
}

function getPersonIssues(person: PersonRecord) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
  }[] = [];

  if (!person.phone && !person.email) {
    issues.push({
      label: "Add contact",
      tone: "warning",
    });
  }

  if (!person.address) {
    issues.push({
      label: "Add address",
      tone: "neutral",
    });
  }

  if (!person.customer_type) {
    issues.push({
      label: "Add type",
      tone: "neutral",
    });
  }

  if (issues.length === 0) {
    issues.push({
      label: "Looks clean",
      tone: "success",
    });
  }

  return issues;
}

export default async function PeoplePage() {
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

  async function createPerson(formData: FormData) {
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
      throw new Error("Name is required.");
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
      throw new Error(error.message);
    }

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

  const people = (data || []) as PersonRecord[];

  const missingContact = people.filter(
    (person) => !person.phone && !person.email,
  );
  const missingAddress = people.filter((person) => !person.address);
  const missingType = people.filter((person) => !person.customer_type);

  const cleanPeople = people.filter(
    (person) =>
      (person.phone || person.email) && person.address && person.customer_type,
  );

  const cleanupGroups = [
    {
      id: "missing-contact",
      label: "Add contact",
      title: "People need contact details",
      detail: "Records without phone or email are harder to follow up with.",
      count: missingContact.length,
    },
    {
      id: "missing-address",
      label: "Add address",
      title: "People need addresses",
      detail:
        "Addresses help with service area, job planning, and local context.",
      count: missingAddress.length,
    },
    {
      id: "missing-type",
      label: "Add type",
      title: "People need a type",
      detail:
        "Types help separate customers, leads, clients, vendors, or accounts.",
      count: missingType.length,
    },
  ].filter((item) => item.count > 0);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="People"
          title="Manage people and businesses"
          description="Track customers, clients, patients, companies, and anyone else connected to the workspace."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/leads"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Opportunities
              </Link>

              <Link
                href="/imports"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Import data
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total people"
            value={people.length}
            helper="People and businesses in the workspace"
          />

          <StatCard
            label="Needs contact"
            value={missingContact.length}
            helper="Missing phone and email"
            tone={missingContact.length > 0 ? "warning" : "positive"}
          />

          <StatCard
            label="Needs address"
            value={missingAddress.length}
            helper="Missing address or location"
            tone={missingAddress.length > 0 ? "warning" : "positive"}
          />

          <StatCard
            label="Clean records"
            value={cleanPeople.length}
            helper="Contact, address, and type are filled"
            tone={cleanPeople.length > 0 ? "positive" : "default"}
          />
        </section>

        <SectionCard
          title="Add person"
          description="Create a person, customer, client, patient, or business manually."
        >
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold text-slate-950">Quick add</p>
                <p className="mt-1 text-sm text-slate-500">
                  Add the basic contact details now. You can attach
                  opportunities later.
                </p>
              </div>

              <span className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white group-open:hidden">
                Add person
              </span>

              <span className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 group-open:inline-flex">
                Close
              </span>
            </summary>

            <form
              action={createPerson}
              className="border-t border-slate-100 p-5"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Name
                  <input
                    name="name"
                    required
                    placeholder="Ocean View Test Home, John Smith, ABC Flooring..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Type
                  <input
                    name="customer_type"
                    placeholder="Customer, lead, commercial, residential..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
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

              <label className="mt-4 block text-sm font-medium text-slate-700">
                Address
                <input
                  name="address"
                  placeholder="Service address, city, or area"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <label className="mt-4 block text-sm font-medium text-slate-700">
                Notes
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Add context, preferences, project details, or anything important..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Create person
                </button>
              </div>
            </form>
          </details>
        </SectionCard>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr] items-start">
          <SectionCard
            title="People"
            description="Newest people and businesses in the workspace."
          >
            {people.length === 0 ? (
              <EmptyState
                title="No people yet"
                description="Add a person manually or import people from CSV or Google Sheets."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {people.map((person) => {
                  const issues = getPersonIssues(person);

                  return (
                    <article key={person.id} className="p-4">
                      <div className="grid gap-4 md:grid-cols-[1fr_170px_140px_90px] md:items-start">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {person.name || "Unnamed person"}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {person.email ||
                              person.phone ||
                              person.address ||
                              "No contact details saved"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {issues.slice(0, 3).map((issue) => (
                              <StatusBadge key={issue.label} tone={issue.tone}>
                                {issue.label}
                              </StatusBadge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-500">
                            Type
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {person.customer_type || "Not set"}
                          </p>

                          <p className="mt-3 text-xs font-medium text-slate-500">
                            Address
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {person.address || "Not set"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-500">
                            Added
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {formatDate(person.created_at)}
                          </p>
                        </div>

                        <div className="md:text-right">
                          <Link
                            href={`/customers/${person.id}/edit`}
                            className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Open
                          </Link>
                        </div>
                      </div>

                      {person.notes && (
                        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                          {person.notes}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="People health"
              description="Grouped issues affecting customer and follow-up quality."
            >
              {cleanupGroups.length === 0 ? (
                <EmptyState
                  title="People records look clean"
                  description="No missing contact, address, or type issues were found."
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {cleanupGroups.map((item) => (
                    <article
                      key={item.id}
                      className="flex items-start justify-between gap-4 p-4"
                    >
                      <div>
                        <StatusBadge tone="neutral">{item.label}</StatusBadge>
                        <p className="mt-2 font-semibold text-slate-950">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {item.detail}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {item.count}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Next step"
              description="How people connect to the rest of the workspace."
            >
              <div className="space-y-3 p-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-950">
                    Turn people into opportunities
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    After adding a person, create an opportunity and link it to
                    them from the Opportunities page.
                  </p>
                  <Link
                    href="/leads"
                    className="mt-4 inline-flex rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Go to Opportunities
                  </Link>
                </div>
              </div>
            </SectionCard>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
