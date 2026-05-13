import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { DismissError } from "@/components/ui/DismissError";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { formatTimestampDate } from "@/lib/date-format";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getFormString } from "@/lib/utils";
import { DeleteConfirm } from "@/components/ui/DeleteConfirm";

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
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

  async function deletePerson() {
    "use server";
    const supabase = await createClient();
    const currentCompany = await getCurrentCompany();
    if (!currentCompany) redirect("/onboarding");
    const { company } = currentCompany;
    await supabase.from("customers").delete().eq("id", id).eq("company_id", company.id);
    revalidatePath("/customers");
    revalidatePath("/workspace");
    redirect("/customers");
  }

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
      redirect(`/customers/${id}/edit?error=Name+is+required.`);
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
      redirect(
        `/customers/${id}/edit?error=${encodeURIComponent(error.message)}`,
      );
    }

    revalidatePath("/customers");
    revalidatePath("/workspace");
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

  const [{ count: leadsCount }, { count: jobsCount }, { count: followUpsCount }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", id)
        .eq("company_id", company.id),
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", id)
        .eq("company_id", company.id),
      supabase
        .from("follow_ups")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", id)
        .eq("company_id", company.id),
    ]);

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
          eyebrow={`Edit ${profile.labels.customerSingular.toLowerCase()}`}
          title={person.name || `Unnamed ${profile.labels.customerSingular.toLowerCase()}`}
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
              {errorParam && <DismissError message={errorParam} />}

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Name">
                  <Input
                    name="name"
                    required
                    autoComplete="name"
                    defaultValue={person.name || ""}
                    placeholder="John Smith, ABC Flooring, Ocean View Home…"
                  />
                </FormField>

                <FormField label="Type">
                  <Input
                    name="customer_type"
                    defaultValue={person.customer_type || ""}
                    placeholder="Customer, lead, residential, commercial…"
                  />
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Phone">
                  <Input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    defaultValue={person.phone || ""}
                    placeholder="808-555-1234"
                  />
                </FormField>

                <FormField label="Email">
                  <Input
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={person.email || ""}
                    placeholder="customer@example.com"
                  />
                </FormField>
              </div>

              <FormField label="Address">
                <Input
                  name="address"
                  defaultValue={person.address || ""}
                  placeholder="Service address, city, or area"
                />
              </FormField>

              <FormField label="Notes">
                <Textarea
                  name="notes"
                  rows={5}
                  defaultValue={person.notes || ""}
                  placeholder="Add preferences, project details, contact history, or anything important…"
                />
              </FormField>

              <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
                <Link
                  href="/customers"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Link>

                <SubmitButton>Save person</SubmitButton>
              </div>
            </form>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="Record summary"
              description="How this person is currently stored."
            >
              <div className="space-y-4 p-5">
                <SummaryCard
                  label="Contact"
                  value={person.phone || person.email || "Incomplete contact saved"}
                  helper={
                    person.phone && person.email
                      ? person.email
                      : "Phone or email helps with follow-up."
                  }
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <SummaryCard label="Type" value={person.customer_type} />
                  <SummaryCard
                    label="Added"
                    value={formatTimestampDate(person.created_at)}
                  />
                </div>

                <SummaryCard
                  label="Address"
                  value={person.address || "No address saved"}
                />

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Linked records</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {[
                      leadsCount ? `${leadsCount} ${leadsCount === 1 ? profile.labels.leadSingular.toLowerCase() : profile.labels.leadPlural.toLowerCase()}` : null,
                      jobsCount ? `${jobsCount} ${jobsCount === 1 ? profile.labels.jobSingular.toLowerCase() : profile.labels.jobPlural.toLowerCase()}` : null,
                      followUpsCount ? `${followUpsCount} follow-up${followUpsCount !== 1 ? "s" : ""}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No linked records yet"}
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

            <SectionCard title="Danger zone" description="Permanent actions that cannot be undone.">
              <div className="p-5">
                <DeleteConfirm
                  action={deletePerson}
                  description="This will permanently delete this person. Linked jobs, opportunities, and follow-ups will lose this connection but will not be deleted."
                />
              </div>
            </SectionCard>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
