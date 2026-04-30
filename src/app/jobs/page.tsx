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

const jobStatuses = [
  "Scheduled",
  "In Progress",
  "Completed",
  "Paid",
  "Cancelled",
];

const paidStatuses = ["Unpaid", "Partial", "Paid"];

async function createJobAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const customerId = String(formData.get("customerId") || "").trim();
  const leadId = String(formData.get("leadId") || "").trim();
  const serviceType = String(formData.get("serviceType") || "").trim();
  const status = String(formData.get("status") || "Scheduled").trim();
  const jobValue = String(formData.get("jobValue") || "").trim();
  const startDate = String(formData.get("startDate") || "").trim();
  const completedDate = String(formData.get("completedDate") || "").trim();
  const paidStatus = String(formData.get("paidStatus") || "Unpaid").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!serviceType) {
    throw new Error("Service type is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("jobs").insert({
    company_id: companyId,
    customer_id: customerId || null,
    lead_id: leadId || null,
    service_type: serviceType,
    status: status || "Scheduled",
    job_value: jobValue ? Number(jobValue) : null,
    start_date: startDate || null,
    completed_date: completedDate || null,
    paid_status: paidStatus || "Unpaid",
    notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/jobs");
  revalidatePath("/workspace");
  revalidatePath("/data-hub");
}

async function deleteJobAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const jobId = String(formData.get("jobId") || "");

  if (!jobId) {
    throw new Error("Job ID is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/jobs");
  revalidatePath("/workspace");
  revalidatePath("/data-hub");
}

function formatCurrency(value: number | string | null) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString();
}

function getCustomerName(customerRelation: unknown) {
  if (Array.isArray(customerRelation)) {
    return customerRelation[0]?.name || "No customer linked";
  }

  if (
    typeof customerRelation === "object" &&
    customerRelation !== null &&
    "name" in customerRelation
  ) {
    return String(
      (customerRelation as { name?: string | null }).name ||
        "No customer linked",
    );
  }

  return "No customer linked";
}

function getLeadName(leadRelation: unknown) {
  if (Array.isArray(leadRelation)) {
    return leadRelation[0]?.service_requested || "No opportunity linked";
  }

  if (
    typeof leadRelation === "object" &&
    leadRelation !== null &&
    "service_requested" in leadRelation
  ) {
    return String(
      (leadRelation as { service_requested?: string | null })
        .service_requested || "No opportunity linked",
    );
  }

  return "No opportunity linked";
}

function getStatusTone(status: string | null) {
  if (status === "Completed" || status === "Paid") {
    return "success" as const;
  }

  if (status === "In Progress" || status === "Scheduled") {
    return "neutral" as const;
  }

  if (status === "Cancelled") {
    return "danger" as const;
  }

  return "neutral" as const;
}

function getPaidTone(status: string | null) {
  if (status === "Paid") {
    return "success" as const;
  }

  if (status === "Partial") {
    return "warning" as const;
  }

  if (status === "Unpaid") {
    return "danger" as const;
  }

  return "neutral" as const;
}

export default async function JobsPage() {
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

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name")
    .eq("company_id", company.id)
    .order("name", { ascending: true });

  if (customersError) {
    throw new Error(customersError.message);
  }

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, service_requested, status, estimated_value")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select(
      `
      id,
      customer_id,
      lead_id,
      status,
      job_value,
      service_type,
      start_date,
      completed_date,
      paid_status,
      notes,
      created_at,
      customers (
        name
      ),
      leads (
        service_requested
      )
    `,
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const customerRecords = customers || [];
  const leadRecords = leads || [];
  const jobRecords = jobs || [];

  const totalJobs = jobRecords.length;

  const scheduledJobs = jobRecords.filter(
    (job) => job.status === "Scheduled",
  ).length;

  const activeJobs = jobRecords.filter(
    (job) => job.status === "Scheduled" || job.status === "In Progress",
  ).length;

  const inProgressJobs = jobRecords.filter(
    (job) => job.status === "In Progress",
  ).length;

  const completedJobs = jobRecords.filter(
    (job) => job.status === "Completed" || job.status === "Paid",
  ).length;

  const cancelledJobs = jobRecords.filter(
    (job) => job.status === "Cancelled",
  ).length;

  const totalJobValue = jobRecords.reduce(
    (sum, job) => sum + Number(job.job_value || 0),
    0,
  );

  const activeJobValue = jobRecords
    .filter((job) => job.status === "Scheduled" || job.status === "In Progress")
    .reduce((sum, job) => sum + Number(job.job_value || 0), 0);

  const unpaidJobValue = jobRecords
    .filter((job) => job.paid_status !== "Paid")
    .reduce((sum, job) => sum + Number(job.job_value || 0), 0);

  const jobsMissingCustomer = jobRecords.filter(
    (job) => !job.customer_id,
  ).length;

  const jobsMissingLead = jobRecords.filter((job) => !job.lead_id).length;

  const jobsMissingValue = jobRecords.filter(
    (job) => !job.job_value || Number(job.job_value) === 0,
  ).length;

  const jobsMissingStartDate = jobRecords.filter(
    (job) => !job.start_date,
  ).length;

  const jobsWithoutNotes = jobRecords.filter((job) => !job.notes).length;

  const upcomingJobs = jobRecords
    .filter((job) => job.status === "Scheduled")
    .slice(0, 5);

  const activeWork = jobRecords
    .filter((job) => job.status === "Scheduled" || job.status === "In Progress")
    .slice(0, 6);

  const unpaidJobs = jobRecords
    .filter((job) => job.paid_status !== "Paid")
    .slice(0, 6);

  const statusSummary = jobStatuses.map((status) => ({
    status,
    count: jobRecords.filter((job) => job.status === status).length,
    value: jobRecords
      .filter((job) => job.status === status)
      .reduce((sum, job) => sum + Number(job.job_value || 0), 0),
  }));

  const cleanupItems = [
    {
      label: `${profile.labels.jobPlural} without a linked ${profile.labels.customerSingular.toLowerCase()}`,
      value: jobsMissingCustomer,
      description:
        "Work records should usually connect to the customer or client receiving the work.",
    },
    {
      label: `${profile.labels.jobPlural} not linked to an opportunity`,
      value: jobsMissingLead,
      description:
        "Linking work to pipeline records helps show how opportunities turn into revenue.",
    },
    {
      label: `${profile.labels.jobPlural} missing value`,
      value: jobsMissingValue,
      description:
        "Work value helps track projected revenue, unpaid work, and business performance.",
    },
    {
      label: `${profile.labels.jobPlural} missing start date`,
      value: jobsMissingStartDate,
      description:
        "Dates help show what is scheduled, active, completed, or falling behind.",
    },
    {
      label: `${profile.labels.jobPlural} without notes`,
      value: jobsWithoutNotes,
      description:
        "Notes preserve job details, scope, customer context, and handoff information.",
    },
  ];

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
          title={profile.labels.jobPlural}
          description={`Track ${profile.labels.jobPlural.toLowerCase()}, status, value, dates, payment state, notes, and related customer history so work does not get scattered across memory, texts, and spreadsheets.`}
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={`Active ${profile.labels.jobPlural.toLowerCase()}`}
            value={activeJobs}
            helper={`${scheduledJobs} scheduled / ${inProgressJobs} in progress`}
          />

          <StatCard
            label="Active work value"
            value={formatCurrency(activeJobValue)}
            helper="Scheduled and in-progress value"
          />

          <StatCard
            label="Unpaid work value"
            value={formatCurrency(unpaidJobValue)}
            helper="Jobs not marked fully paid"
            tone={unpaidJobValue > 0 ? "warning" : "default"}
          />

          <StatCard
            label="Completed"
            value={completedJobs}
            helper={`${cancelledJobs} cancelled`}
            tone={completedJobs > 0 ? "positive" : "default"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.75fr_1.25fr]">
          <SectionCard
            title={`Add ${profile.labels.jobSingular.toLowerCase()}`}
            description="Create a work record that can connect back to customers, opportunities, revenue, and notes."
          >
            <form action={createJobAction} className="space-y-4 p-5">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {profile.labels.customerSingular}
                </label>
                <select
                  name="customerId"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">No customer linked</option>
                  {customerRecords.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Related {profile.labels.leadSingular.toLowerCase()}
                </label>
                <select
                  name="leadId"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">No opportunity linked</option>
                  {leadRecords.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.service_requested} —{" "}
                      {formatCurrency(lead.estimated_value)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Work / service type
                </label>
                <input
                  name="serviceType"
                  required
                  placeholder="Driveway repair, cleaning visit, appointment, project..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue="Scheduled"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {jobStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Payment status
                  </label>
                  <select
                    name="paidStatus"
                    defaultValue="Unpaid"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {paidStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Work value
                </label>
                <input
                  name="jobValue"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="3500"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Start date
                  </label>
                  <input
                    name="startDate"
                    type="date"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Completed date
                  </label>
                  <input
                    name="completedDate"
                    type="date"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Scope, job notes, access instructions, materials, appointment context, or handoff details..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Save {profile.labels.jobSingular.toLowerCase()}
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Work control"
            description="A clean view of active work, unpaid work, and operational data quality."
          >
            <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">
                  Total value
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {formatCurrency(totalJobValue)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Value across all stored work records.
                </p>
              </div>

              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">
                  Active work
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {activeJobs}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Scheduled or currently in progress.
                </p>
              </div>

              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">
                  Data cleanup
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {jobsMissingCustomer +
                    jobsMissingValue +
                    jobsMissingStartDate}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Missing customer, value, or start date.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 p-5">
              <p className="text-sm font-semibold text-slate-950">
                Status breakdown
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
                {statusSummary.map((item) => (
                  <div
                    key={item.status}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {item.status}
                      </p>
                      <StatusBadge tone={getStatusTone(item.status)}>
                        {item.count}
                      </StatusBadge>
                    </div>

                    <p className="mt-2 text-xs font-medium text-slate-500">
                      {formatCurrency(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <SectionCard
            title="Cleanup queue"
            description="Fix these items to make operational reporting more accurate."
          >
            <div className="divide-y divide-slate-100">
              {cleanupItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-4 p-5"
                >
                  <div>
                    <p className="font-semibold text-slate-950">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  </div>

                  <StatusBadge tone={item.value > 0 ? "warning" : "success"}>
                    {item.value}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Active work"
            description={`${profile.labels.jobPlural} currently scheduled or in progress.`}
          >
            {activeWork.length === 0 ? (
              <EmptyState
                title="No active work"
                description={`Add scheduled or in-progress ${profile.labels.jobPlural.toLowerCase()} to track work happening now.`}
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {activeWork.map((job) => (
                  <div
                    key={job.id}
                    className="grid gap-4 p-5 md:grid-cols-[1fr_140px_140px]"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {job.service_type || "Untitled work record"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {getCustomerName(job.customers)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Status
                      </p>
                      <div className="mt-1">
                        <StatusBadge tone={getStatusTone(job.status)}>
                          {job.status || "Unknown"}
                        </StatusBadge>
                      </div>
                    </div>

                    <div className="md:text-right">
                      <p className="text-xs font-medium text-slate-500">
                        Value
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {formatCurrency(job.job_value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <SectionCard
          title={`${profile.labels.jobPlural} records`}
          description="Operational records with customer context, related opportunities, value, dates, payment status, and notes."
        >
          {jobRecords.length === 0 ? (
            <EmptyState
              title={`No ${profile.labels.jobPlural.toLowerCase()} yet`}
              description={`Add your first ${profile.labels.jobSingular.toLowerCase()} to begin tracking scheduled work, active work, completed work, and unpaid work.`}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {jobRecords.map((job) => (
                <article
                  key={job.id}
                  className="grid gap-4 p-5 md:grid-cols-[1.1fr_1fr_1fr_130px_90px]"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {job.service_type || "Untitled work record"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {getCustomerName(job.customers)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Related: {getLeadName(job.leads)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Value / payment
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {formatCurrency(job.job_value)}
                    </p>
                    <div className="mt-2">
                      <StatusBadge tone={getPaidTone(job.paid_status)}>
                        {job.paid_status || "Unknown"}
                      </StatusBadge>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Dates</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Start: {formatDate(job.start_date)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Done: {formatDate(job.completed_date)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Status</p>
                    <div className="mt-2">
                      <StatusBadge tone={getStatusTone(job.status)}>
                        {job.status || "Unknown"}
                      </StatusBadge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Added {formatDate(job.created_at)}
                    </p>
                  </div>

                  <form action={deleteJobAction} className="md:text-right">
                    <input type="hidden" name="jobId" value={job.id} />
                    <button className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
                      Delete
                    </button>
                  </form>

                  {job.notes && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-5">
                      <p className="text-xs font-medium text-slate-500">
                        Notes
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {job.notes}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
