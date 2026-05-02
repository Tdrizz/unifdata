import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { formatDateOnly, formatTimestampDate } from "@/lib/date-format";

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

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getFormString(formData, key);

  if (!value) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getDateInputValue(date: string | null) {
  if (!date) {
    return "";
  }

  return date.includes("T") ? date.slice(0, 10) : date;
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getStatusTone(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (
    normalized.includes("complete") ||
    normalized.includes("done") ||
    normalized.includes("paid")
  ) {
    return "success" as const;
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("failed") ||
    normalized.includes("overdue")
  ) {
    return "danger" as const;
  }

  if (
    normalized.includes("scheduled") ||
    normalized.includes("active") ||
    normalized.includes("progress") ||
    normalized.includes("unpaid") ||
    normalized.includes("partial")
  ) {
    return "warning" as const;
  }

  return "neutral" as const;
}

function isComplete(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  return (
    normalized.includes("complete") ||
    normalized.includes("done") ||
    normalized.includes("finished")
  );
}

function isCancelled(status: string | null) {
  const normalized = String(status || "").toLowerCase();
  return normalized.includes("cancel");
}

function isUnpaid(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  return (
    normalized.includes("unpaid") ||
    normalized.includes("partial") ||
    normalized.includes("due")
  );
}

function getWorkNextStep(work: WorkRecord) {
  if (!work.customer_id) {
    return "Link this work to the person or business it belongs to.";
  }

  if (!work.lead_id) {
    return "Link this work to the opportunity it came from if one exists.";
  }

  if (work.job_value === null || work.job_value === undefined) {
    return "Add a work value so this shows correctly in reporting.";
  }

  if (!work.start_date && !isComplete(work.status)) {
    return "Add a start date so the team knows when this work begins.";
  }

  if (isComplete(work.status) && isUnpaid(work.paid_status)) {
    return "Work is complete, but payment still needs attention.";
  }

  if (isCancelled(work.status)) {
    return "This work is cancelled. Keep it out of active planning.";
  }

  if (isComplete(work.status)) {
    return "This work is complete. Confirm payment and reporting are correct.";
  }

  return "Keep this work updated as it moves toward completion.";
}

function getWorkIssues(work: WorkRecord) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
    detail: string;
  }[] = [];

  if (!work.customer_id) {
    issues.push({
      label: "Link person",
      tone: "warning",
      detail: "Work should usually connect to whoever it is for.",
    });
  }

  if (!work.lead_id) {
    issues.push({
      label: "Link opportunity",
      tone: "neutral",
      detail:
        "Linking work to an opportunity keeps the full lifecycle connected.",
    });
  }

  if (work.job_value === null || work.job_value === undefined) {
    issues.push({
      label: "Add value",
      tone: "neutral",
      detail: "Work value keeps active and completed work reporting accurate.",
    });
  }

  if (!work.start_date && !isComplete(work.status)) {
    issues.push({
      label: "Add start date",
      tone: "neutral",
      detail: "Start date helps with scheduling and planning.",
    });
  }

  if (isComplete(work.status) && isUnpaid(work.paid_status)) {
    issues.push({
      label: "Payment needed",
      tone: "danger",
      detail: "Completed work should be checked against payment.",
    });
  }

  if (issues.length === 0) {
    issues.push({
      label: "Looks clean",
      tone: "success",
      detail: "This work record has the key fields needed for reporting.",
    });
  }

  return issues;
}

export default async function EditWorkPage({
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

  async function updateWork(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const currentCompany = await getCurrentCompany();

    if (!currentCompany) {
      redirect("/onboarding");
    }

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
      throw new Error("Work name is required.");
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
      throw new Error(error.message);
    }

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

  if (workResult.error) {
    throw new Error(workResult.error.message);
  }

  if (peopleResult.error) {
    throw new Error(peopleResult.error.message);
  }

  if (opportunitiesResult.error) {
    throw new Error(opportunitiesResult.error.message);
  }

  if (!workResult.data) {
    redirect("/jobs");
  }

  const work = workResult.data as WorkRecord;
  const people = (peopleResult.data || []) as PersonRecord[];
  const opportunities = (opportunitiesResult.data || []) as OpportunityRecord[];

  const linkedPerson = work.customer_id
    ? people.find((person) => person.id === work.customer_id)
    : null;

  const linkedOpportunity = work.lead_id
    ? opportunities.find((opportunity) => opportunity.id === work.lead_id)
    : null;

  const issues = getWorkIssues(work);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Edit work"
          title={work.service_type || "Untitled work"}
          description="Update the linked person, opportunity, stage, payment status, dates, and work value."
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
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Link to person or business
                  <select
                    name="customer_id"
                    defaultValue={work.customer_id || ""}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
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
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Link to opportunity
                  <select
                    name="lead_id"
                    defaultValue={work.lead_id || ""}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="">No linked opportunity yet</option>
                    {opportunities.map((opportunity) => (
                      <option key={opportunity.id} value={opportunity.id}>
                        {opportunity.service_requested ||
                          formatCurrency(opportunity.estimated_value)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Work name
                <input
                  name="service_type"
                  required
                  defaultValue={work.service_type || ""}
                  placeholder="Flooring install, website build, service visit..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-medium text-slate-700">
                  Work value
                  <input
                    name="job_value"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={work.job_value ?? ""}
                    placeholder="2500"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Work stage
                  <select
                    name="status"
                    defaultValue={work.status || "Scheduled"}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Active">Active</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Payment status
                  <select
                    name="paid_status"
                    defaultValue={work.paid_status || "Unpaid"}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Start date
                  <input
                    name="start_date"
                    type="date"
                    defaultValue={getDateInputValue(work.start_date)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Completed date
                  <input
                    name="completed_date"
                    type="date"
                    defaultValue={getDateInputValue(work.completed_date)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
                <Link
                  href="/jobs"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Save work
                </button>
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
                  <p className="text-sm font-medium text-slate-500">
                    Next step
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {getWorkNextStep(work)}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Value</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">
                      {formatCurrency(work.job_value)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Stage</p>
                    <div className="mt-2">
                      <StatusBadge tone={getStatusTone(work.status)}>
                        {work.status || "Scheduled"}
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">
                      Linked person
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {linkedPerson?.name || "No person linked"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {linkedPerson?.email ||
                        linkedPerson?.phone ||
                        "Connect this work to a person or business."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">
                      Linked opportunity
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {linkedOpportunity?.service_requested ||
                        "No opportunity linked"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {linkedOpportunity?.status ||
                        "Optional, but useful for lifecycle tracking."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Start</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {formatDateOnly(work.start_date)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Added</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {formatTimestampDate(work.created_at)}
                    </p>
                  </div>
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
