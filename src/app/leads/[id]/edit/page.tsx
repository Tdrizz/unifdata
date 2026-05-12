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
import { Input, Textarea, Select } from "@/components/ui/Input";
import { DismissError } from "@/components/ui/DismissError";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { formatDateOnly } from "@/lib/date-format";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getFormString, getOptionalNumber, formatCurrency } from "@/lib/utils";
import { getOpportunityTone } from "@/lib/status";
import { DeleteConfirm } from "@/components/ui/DeleteConfirm";
import { OPPORTUNITY_STATUSES } from "@/lib/constants";

type OpportunityRecord = {
  id: string;
  customer_id: string | null;
  service_requested: string | null;
  status: string | null;
  estimated_value: number | null;
  source: string | null;
  next_follow_up_date: string | null;
  notes: string | null;
  created_at: string;
};

type PersonRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

function getOpportunityIssues(opportunity: OpportunityRecord) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
  }[] = [];

  if (!opportunity.customer_id) {
    issues.push({ label: "Link person", tone: "warning" });
  }

  if (!opportunity.source) {
    issues.push({ label: "Add source", tone: "neutral" });
  }

  if (
    opportunity.estimated_value === null ||
    opportunity.estimated_value === undefined
  ) {
    issues.push({ label: "Add estimate", tone: "neutral" });
  }

  if (!opportunity.next_follow_up_date) {
    issues.push({ label: "Add follow-up", tone: "warning" });
  }

  if (issues.length === 0) {
    issues.push({ label: "Looks clean", tone: "success" });
  }

  return issues;
}

export default async function EditOpportunityPage({
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

  async function deleteOpportunity() {
    "use server";
    const supabase = await createClient();
    const currentCompany = await getCurrentCompany();
    if (!currentCompany) redirect("/onboarding");
    const { company } = currentCompany;
    await supabase.from("leads").delete().eq("id", id).eq("company_id", company.id);
    revalidatePath("/leads");
    revalidatePath("/crm");
    revalidatePath("/workspace");
    redirect("/leads");
  }

  async function updateOpportunity(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const currentCompany = await getCurrentCompany();

    if (!currentCompany) {
      redirect("/onboarding");
    }

    const { company } = currentCompany;

    const customerId = getFormString(formData, "customer_id");
    const serviceRequested = getFormString(formData, "service_requested");
    const status = getFormString(formData, "status") || "New";
    const estimatedValue = getOptionalNumber(formData, "estimated_value");
    const source = getFormString(formData, "source");
    const nextFollowUpDate = getFormString(formData, "next_follow_up_date");
    const notes = getFormString(formData, "notes");

    if (!serviceRequested) {
      redirect(`/leads/${id}/edit?error=Opportunity+name+is+required.`);
    }

    const { error } = await supabase
      .from("leads")
      .update({
        customer_id: customerId || null,
        service_requested: serviceRequested,
        status,
        estimated_value: estimatedValue,
        source: source || null,
        next_follow_up_date: nextFollowUpDate || null,
        notes: notes || null,
      })
      .eq("id", id)
      .eq("company_id", company.id);

    if (error) {
      redirect(`/leads/${id}/edit?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/leads");
    revalidatePath("/crm");
    revalidatePath("/workspace");
    redirect("/leads");
  }

  const [opportunityResult, peopleResult] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, customer_id, service_requested, status, estimated_value, source, next_follow_up_date, notes, created_at",
      )
      .eq("id", id)
      .eq("company_id", company.id)
      .maybeSingle(),

    supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  if (opportunityResult.error) {
    throw new Error(opportunityResult.error.message);
  }

  if (peopleResult.error) {
    throw new Error(peopleResult.error.message);
  }

  if (!opportunityResult.data) {
    redirect("/leads");
  }

  const opportunity = opportunityResult.data as OpportunityRecord;
  const people = (peopleResult.data || []) as PersonRecord[];
  const issues = getOpportunityIssues(opportunity);

  const linkedPerson = opportunity.customer_id
    ? people.find((person) => person.id === opportunity.customer_id)
    : null;

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
          eyebrow={`Edit ${profile.labels.leadSingular.toLowerCase()}`}
          title={
            opportunity.service_requested ||
            `Untitled ${profile.labels.leadSingular.toLowerCase()}`
          }
          description={`Update the linked ${profile.labels.customerSingular.toLowerCase()}, value, source, status, follow-up date, and notes.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/leads"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to opportunities
              </Link>

              <Link
                href="/crm"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Pipeline
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <SectionCard
            title="Opportunity details"
            description="These fields control how this record appears in Pipeline, Follow-Ups, and Home."
          >
            <form action={updateOpportunity} className="space-y-5 p-5">
              {errorParam && <DismissError message={errorParam} />}

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Link to person or business">
                  <Select
                    name="customer_id"
                    defaultValue={opportunity.customer_id || ""}
                  >
                    <option value="">No linked person yet</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name ||
                          person.email ||
                          person.phone ||
                          "Unnamed person"}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Status">
                  <Select
                    name="status"
                    defaultValue={opportunity.status || "New"}
                  >
                    {OPPORTUNITY_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              <FormField label="Opportunity name">
                <Input
                  name="service_requested"
                  required
                  defaultValue={opportunity.service_requested || ""}
                  placeholder="Website redesign, flooring quote, monthly service plan…"
                />
              </FormField>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Estimated value">
                  <Input
                    name="estimated_value"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={opportunity.estimated_value ?? ""}
                    placeholder="2500"
                  />
                </FormField>

                <FormField label="Source">
                  <Input
                    name="source"
                    defaultValue={opportunity.source || ""}
                    placeholder="Referral, Google, Facebook, Website…"
                  />
                </FormField>

                <FormField label="Next follow-up">
                  <Input
                    name="next_follow_up_date"
                    type="date"
                    defaultValue={opportunity.next_follow_up_date || ""}
                  />
                </FormField>
              </div>

              <FormField label="Notes">
                <Textarea
                  name="notes"
                  rows={5}
                  defaultValue={opportunity.notes || ""}
                  placeholder="Add quote notes, next steps, or context…"
                />
              </FormField>

              <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
                <Link
                  href="/leads"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Link>

                <SubmitButton>Save opportunity</SubmitButton>
              </div>
            </form>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="Record summary"
              description="How this opportunity is currently being interpreted."
            >
              <div className="space-y-4 p-5">
                <SummaryCard
                  label="Linked to"
                  value={linkedPerson?.name || "No person linked"}
                  helper={
                    linkedPerson?.email ||
                    linkedPerson?.phone ||
                    "Connect this opportunity to a person or business."
                  }
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <SummaryCard
                    label="Value"
                    value={formatCurrency(opportunity.estimated_value)}
                  />

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Status</p>
                    <div className="mt-2">
                      <StatusBadge tone={getOpportunityTone(opportunity.status)}>
                        {opportunity.status || "New"}
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                <SummaryCard
                  label="Next follow-up"
                  value={formatDateOnly(opportunity.next_follow_up_date)}
                  helper="This date also appears on the Follow-Ups page."
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Cleanup"
              description="Issues affecting pipeline and follow-up reporting."
            >
              <div className="space-y-3 p-5">
                {issues.map((issue) => (
                  <div
                    key={issue.label}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <StatusBadge tone={issue.tone}>{issue.label}</StatusBadge>
                    <p className="text-sm font-medium text-slate-500">
                      {issue.label === "Looks clean"
                        ? "No action needed"
                        : "Needs update"}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Danger zone" description="Permanent actions that cannot be undone.">
              <div className="p-5">
                <DeleteConfirm
                  action={deleteOpportunity}
                  description="This will permanently delete this opportunity. Linked jobs and follow-ups will lose this connection but will not be deleted."
                />
              </div>
            </SectionCard>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
