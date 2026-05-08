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
import { Input, Select } from "@/components/ui/Input";
import { DismissError } from "@/components/ui/DismissError";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { formatDateOnly, formatTimestampDate } from "@/lib/date-format";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getFormString, getOptionalNumber, getDateInputValue, formatCurrency } from "@/lib/utils";
import { isCompleteWork, isUnpaid, getWorkTone } from "@/lib/status";

type WorkRecord = {
  id: string;
  customer_id: string | null;
  lead_id: string | null;
  service_type: string | null;
  status: string | null;
  job_value: number | null;
  start_date: string | null;
  completed_date: string | null;
  paid_status: string | null;
  created_at: string;
};

type PersonRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

type OpportunityRecord = {
  id: string;
  service_requested: string | null;
  status: string | null;
  estimated_value: number | null;
};

function isCancelled(status: string | null) {
  return String(status || "").toLowerCase().includes("cancel");
}

function getWorkNextStep(work: WorkRecord) {
  if (!work.customer_id)
    return "Link this work to the person or business it belongs to.";
  if (!work.lead_id)
    return "Link this work to the opportunity it came from if one exists.";
  if (work.job_value === null || work.job_value === undefined)
    return "Add a work value so this shows correctly in reporting.";
  if (!work.start_date && !isCompleteWork(work.status))
    return "Add a start date so the team knows when this work begins.";
  if (isCompleteWork(work.status) && isUnpaid(work.paid_status))
    return "Work is complete, but payment still needs attention.";
  if (isCancelled(work.status))
    return "This work is cancelled. Keep it out of active planning.";
  if (isCompleteWork(work.status))
    return "This work is complete. Confirm payment and reporting are correct.";
  return "Keep this work updated as it moves toward completion.";
}

function getWorkIssues(work: WorkRecord) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
    detail: string;
  }[] = [];

  if (!work.customer_id)
    issues.push({
      label: "Link person",
      tone: "warning",
      detail: "Work should usually connect to whoever it is for.",
    });

  if (!work.lead_id)
    issues.push({
      label: "Link opportunity",
      tone: "neutral",
      detail: "Linking work to an opportunity keeps the full lifecycle connected.",
    });

  if (work.job_value === null || work.job_value === undefined)
    issues.push({
      label: "Add value",
      tone: "neutral",
      detail: "Work value keeps active and completed work reporting accurate.",
    });

  if (!work.start_date && !isCompleteWork(work.status))
    issues.push({
      label: "Add start date",
      tone: "neutral",
      detail: "Start date helps with scheduling and planning.",
    });

  if (isCompleteWork(work.status) && isUnpaid(work.paid_status))
    issues.push({
      label: "Payment needed",
      tone: "danger",
      detail: "Completed work should be checked against payment.",
    });

  if (issues.length === 0)
    issues.push({
      label: "Looks clean",
      tone: "success",
      detail: "This work record has the key fields needed for reporting.",
    });

  return issues;
}

export default async function EditWorkPage({
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

  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

  async function updateWork(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const currentCompany = await getCurrentCompany();
    if (!currentCompany) redirect("/onboarding");

    const { company } = currentCompany;

    const customerId = getFormString(formData, "customer_id");
    const leadId = getFormString(formData, "lead_id");
    const serviceType = getFormString(formData, "service_type");
    const status = getFormString(formData, "status") || "Scheduled";
    const jobValue = getOptionalNumber(formData, "job_value");
    const startDate = getFormString(formData, "start_date");
    const completedDate = getFormString(formData, "completed_date");
    const paidStatus = getFormString(formData, "paid_status") || "Unpaid";

    if (!serviceType) {
      redirect(`/jobs/${id}/edit?error=Work+name+is+required.`);
    }

    const { error } = await supabase
      .from("jobs")
      .update({
        customer_id: customerId || null,
        lead_id: leadId || null,
        service_type: serviceType,
        status,
        job_value: jobValue,
        start_date: startDate || null,
        completed_date: completedDate || null,
        paid_status: paidStatus,
      })
      .eq("id", id)
      .eq("company_id", company.id);

    if (error) {
      redirect(`/jobs/${id}/edit?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/jobs");
    revalidatePath("/workspace");
    redirect("/jobs");
  }

  const [workResult, peopleResult, opportunitiesResult] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, customer_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, created_at",
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

    supabase
      .from("leads")
      .select("id, service_requested, status, estimated_value")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  if (workResult.error) throw new Error(workResult.error.message);
  if (peopleResult.error) throw new Error(peopleResult.error.message);
  if (opportunitiesResult.error) throw new Error(opportunitiesResult.error.message);
  if (!workResult.data) redirect("/jobs");

  const work = workResult.data as WorkRecord;
  const people = (peopleResult.data || []) as PersonRecord[];
  const opportunities = (opportunitiesResult.data || []) as OpportunityRecord[];
  const linkedPerson = work.customer_id
    ? people.find((p) => p.id === work.customer_id)
    : null;
  const linkedOpportunity = work.lead_id
    ? opportunities.find((o) => o.id === work.lead_id)
    : null;
  const issues = getWorkIssues(work);

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
          eyebrow={`Edit ${profile.labels.jobSingular.toLowerCase()}`}
          title={
            work.service_type ||
            `Untitled ${profile.labels.jobSingular.toLowerCase()}`
          }
          description={`Update the linked ${profile.labels.customerSingular.toLowerCase()}, ${profile.labels.leadSingular.toLowerCase()}, stage, payment status, dates, and value.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/jobs"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to Work
              </Link>
              <Link
                href="/sales"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Revenue
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <SectionCard
            title="Work details"
            description="These fields control how this work appears in Home, Work, and reporting."
          >
            <form action={updateWork} className="space-y-5 p-5">
              {errorParam && <DismissError message={errorParam} />}

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Link to person or business">
                  <Select name="customer_id" defaultValue={work.customer_id || ""}>
                    <option value="">No linked person yet</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name || person.email || person.phone || "Unnamed person"}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Link to opportunity">
                  <Select name="lead_id" defaultValue={work.lead_id || ""}>
                    <option value="">No linked opportunity yet</option>
                    {opportunities.map((opp) => (
                      <option key={opp.id} value={opp.id}>
                        {opp.service_requested || formatCurrency(opp.estimated_value)}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              <FormField label="Work name">
                <Input
                  name="service_type"
                  required
                  defaultValue={work.service_type || ""}
                  placeholder="Flooring install, website build, service visit…"
                />
              </FormField>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Work value">
                  <Input
                    name="job_value"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={work.job_value ?? ""}
                    placeholder="2500"
                  />
                </FormField>

                <FormField label="Work stage">
                  <Select name="status" defaultValue={work.status || "Scheduled"}>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Active">Active</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </Select>
                </FormField>

                <FormField label="Payment status">
                  <Select name="paid_status" defaultValue={work.paid_status || "Unpaid"}>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </Select>
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Start date">
                  <Input
                    name="start_date"
                    type="date"
                    defaultValue={getDateInputValue(work.start_date)}
                  />
                </FormField>

                <FormField label="Completed date">
                  <Input
                    name="completed_date"
                    type="date"
                    defaultValue={getDateInputValue(work.completed_date)}
                  />
                </FormField>
              </div>

              <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
                <Link
                  href="/jobs"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Link>
                <SubmitButton>Save work</SubmitButton>
              </div>
            </form>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="Record summary"
              description="How this work record is currently being interpreted."
            >
              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Next step</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {getWorkNextStep(work)}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <SummaryCard
                    label="Value"
                    value={formatCurrency(work.job_value)}
                  />
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Stage</p>
                    <div className="mt-2">
                      <StatusBadge tone={getWorkTone(work.status)}>
                        {work.status || "Scheduled"}
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <SummaryCard
                    label="Linked person"
                    value={linkedPerson?.name || "No person linked"}
                    helper={
                      linkedPerson?.email ||
                      linkedPerson?.phone ||
                      "Connect this work to a person or business."
                    }
                  />
                  <SummaryCard
                    label="Linked opportunity"
                    value={
                      linkedOpportunity?.service_requested || "No opportunity linked"
                    }
                    helper={
                      linkedOpportunity?.status ||
                      "Optional, but useful for lifecycle tracking."
                    }
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <SummaryCard
                    label="Start"
                    value={formatDateOnly(work.start_date)}
                  />
                  <SummaryCard
                    label="Added"
                    value={formatTimestampDate(work.created_at)}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Cleanup"
              description="Issues affecting work, payment, and reporting."
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
