import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { formatTimestampDate } from "@/lib/date-format";

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

function getPersonIssues(person: PersonRecord) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
    detail: string;
  }[] = [];

  if (!person.phone && !person.email) {
    issues.push({
      label: "Add contact",
      tone: "warning",
      detail: "Phone or email is needed for follow-up.",
    });
  }

  if (!person.address) {
    issues.push({
      label: "Add address",
      tone: "neutral",
      detail: "Address helps with service area, jobs, and local context.",
    });
  }

  if (!person.customer_type) {
    issues.push({
      label: "Add type",
      tone: "neutral",
      detail: "Type helps separate customers, leads, vendors, or accounts.",
    });
  }

  if (issues.length === 0) {
    issues.push({
      label: "Looks clean",
      tone: "success",
      detail: "This person has contact, address, and type filled in.",
    });
  }

  return issues;
}

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  async function updatePerson(formData: FormData) {
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

    const { error } = await supabase
      .from("customers")
      .update({
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        customer_type: customerType || null,
        notes: notes || null,
      })
      .eq("id", id)
      .eq("company_id", company.id);

    if (error) {
      throw new Error(error.message);
    }

    redirect("/customers");
  }

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, email, address, customer_type, notes, created_at")
    .eq("id", id)
    .eq("company_id", company.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    redirect("/customers");
  }

  const person = data as PersonRecord;
  const issues = getPersonIssues(person);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Edit person"
          title={person.name || "Unnamed person"}
          description="Update contact details, address, type, and notes for this person or business."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/customers"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to People
              </Link>

              <Link
                href="/leads"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Opportunities
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <SectionCard
            title="Person details"
            description="These fields help connect people to opportunities, work, revenue, and follow-ups."
          >
            <form action={updatePerson} className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Name
                  <input
                    name="name"
                    required
                    defaultValue={person.name || ""}
                    placeholder="John Smith, ABC Flooring, Ocean View Home..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Type
                  <input
                    name="customer_type"
                    defaultValue={person.customer_type || ""}
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
                    defaultValue={person.phone || ""}
                    placeholder="808-555-1234"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Email
                  <input
                    name="email"
                    type="email"
                    defaultValue={person.email || ""}
                    placeholder="customer@example.com"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Address
                <input
                  name="address"
                  defaultValue={person.address || ""}
                  placeholder="Service address, city, or area"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Notes
                <textarea
                  name="notes"
                  rows={5}
                  defaultValue={person.notes || ""}
                  placeholder="Add preferences, project details, contact history, or anything important..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
                <Link
                  href="/customers"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Save person
                </button>
              </div>
            </form>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="Record summary"
              description="How this person is currently stored."
            >
              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Contact</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {person.phone || person.email || "Incomplete contact saved"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {person.phone && person.email
                      ? person.email
                      : "Phone or email helps with follow-up."}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Type</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {person.customer_type || "Not set"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Added</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {formatTimestampDate(person.created_at)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Address</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {person.address || "No address saved"}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Cleanup"
              description="Issues affecting follow-up, service area, and reporting."
            >
              <div className="space-y-3 p-5">
                {issues.map((issue) => (
                  <div
                    key={issue.label}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <StatusBadge tone={issue.tone}>{issue.label}</StatusBadge>

                      <p className="text-sm font-medium text-slate-500">
                        {issue.label === "Looks clean"
                          ? "No action needed"
                          : "Needs update"}
                      </p>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {issue.detail}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

