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
import Link from "next/link";

const leadStatuses = [
  "New",
  "Contacted",
  "Estimate Sent",
  "Needs Follow-Up",
  "Won",
  "Lost",
];

async function createLeadAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const customerId = String(formData.get("customerId") || "").trim();
  const serviceRequested = String(
    formData.get("serviceRequested") || "",
  ).trim();
  const status = String(formData.get("status") || "New").trim();
  const estimatedValue = String(formData.get("estimatedValue") || "").trim();
  const source = String(formData.get("source") || "").trim();
  const nextFollowUpDate = String(
    formData.get("nextFollowUpDate") || "",
  ).trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!serviceRequested) {
    throw new Error("Service requested is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("leads").insert({
    company_id: companyId,
    customer_id: customerId || null,
    service_requested: serviceRequested,
    status: status || "New",
    estimated_value: estimatedValue ? Number(estimatedValue) : null,
    source: source || null,
    next_follow_up_date: nextFollowUpDate || null,
    notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/leads");
  revalidatePath("/crm");
  revalidatePath("/workspace");
  revalidatePath("/data-hub");
}

async function deleteLeadAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const leadId = String(formData.get("leadId") || "");

  if (!leadId) {
    throw new Error("Lead ID is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/leads");
  revalidatePath("/crm");
  revalidatePath("/workspace");
  revalidatePath("/data-hub");
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getStaleDateString(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  return date.toISOString();
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

function getStatusTone(status: string | null) {
  if (status === "Won") {
    return "success" as const;
  }

  if (status === "Lost") {
    return "danger" as const;
  }

  if (status === "Estimate Sent" || status === "Needs Follow-Up") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function isOpenStatus(status: string | null) {
  return status !== "Won" && status !== "Lost";
}

export default async function LeadsPage() {
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

  const today = getTodayString();
  const staleCutoff = getStaleDateString(14);

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
    .select(
      `
      id,
      customer_id,
      status,
      estimated_value,
      source,
      service_requested,
      next_follow_up_date,
      notes,
      created_at,
      customers (
        name
      )
    `,
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const leadRecords = leads || [];
  const customerRecords = customers || [];

  const totalLeads = leadRecords.length;

  const openLeads = leadRecords.filter((lead) =>
    isOpenStatus(lead.status),
  ).length;

  const wonLeads = leadRecords.filter((lead) => lead.status === "Won").length;

  const lostLeads = leadRecords.filter((lead) => lead.status === "Lost").length;

  const openPipelineValue = leadRecords
    .filter((lead) => isOpenStatus(lead.status))
    .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);

  const estimateSentValue = leadRecords
    .filter((lead) => lead.status === "Estimate Sent")
    .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);

  const dueFollowUps = leadRecords.filter(
    (lead) =>
      isOpenStatus(lead.status) &&
      Boolean(lead.next_follow_up_date) &&
      lead.next_follow_up_date <= today,
  ).length;

  const staleOpenLeads = leadRecords.filter(
    (lead) => isOpenStatus(lead.status) && lead.created_at < staleCutoff,
  ).length;

  const missingCustomer = leadRecords.filter(
    (lead) => !lead.customer_id,
  ).length;

  const missingSource = leadRecords.filter((lead) => !lead.source).length;

  const missingValue = leadRecords.filter(
    (lead) => !lead.estimated_value || Number(lead.estimated_value) === 0,
  ).length;

  const conversionRate =
    totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  const statusColumns = leadStatuses.map((status) => ({
    status,
    count: leadRecords.filter((lead) => lead.status === status).length,
    value: leadRecords
      .filter((lead) => lead.status === status)
      .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0),
  }));

  const highestValueLeads = leadRecords
    .filter((lead) => isOpenStatus(lead.status))
    .sort(
      (a, b) => Number(b.estimated_value || 0) - Number(a.estimated_value || 0),
    )
    .slice(0, 5);

  const cleanupItems = [
    {
      label: `${profile.labels.leadPlural} without a linked ${profile.labels.customerSingular.toLowerCase()}`,
      value: missingCustomer,
      description:
        "Connecting records to customers keeps the relationship history clean.",
    },
    {
      label: `${profile.labels.leadPlural} missing source`,
      value: missingSource,
      description:
        "Source tracking helps show which marketing or referral channels work.",
    },
    {
      label: `${profile.labels.leadPlural} missing estimated value`,
      value: missingValue,
      description:
        "Estimated value helps prioritize follow-up and pipeline quality.",
    },
    {
      label: "Follow-up dates due",
      value: dueFollowUps,
      description:
        "These open records have a follow-up date due today or earlier.",
    },
    {
      label: "Stale open records",
      value: staleOpenLeads,
      description:
        "These open records are older than 14 days and may need attention.",
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
          title={profile.labels.leadPlural}
          description={`Track ${profile.labels.leadPlural.toLowerCase()}, estimated value, source, status, notes, and follow-up dates so relationship activity does not fall through the cracks.`}
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={`Open ${profile.labels.leadPlural.toLowerCase()}`}
            value={openLeads}
            helper={`${totalLeads} total records`}
          />

          <StatCard
            label="Open pipeline value"
            value={formatCurrency(openPipelineValue)}
            helper="Estimated value on open records"
          />

          <StatCard
            label="Follow-ups due"
            value={dueFollowUps}
            helper="Open records with due follow-up dates"
            tone={dueFollowUps > 0 ? "warning" : "default"}
          />

          <StatCard
            label="Conversion"
            value={`${conversionRate}%`}
            helper={`${wonLeads} won / ${lostLeads} lost`}
            tone={conversionRate > 0 ? "positive" : "default"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.75fr_1.25fr]">
          <SectionCard
            title={`Add ${profile.labels.leadSingular.toLowerCase()}`}
            description="Create a pipeline record that can connect to a customer, job, revenue, and follow-up history."
          >
            <form action={createLeadAction} className="space-y-4 p-5">
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
                  Request / service
                </label>
                <input
                  name="serviceRequested"
                  required
                  placeholder="Driveway repair, new patient consult, policy renewal..."
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
                    defaultValue="New"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {leadStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Estimated value
                  </label>
                  <input
                    name="estimatedValue"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="3500"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Source
                  </label>
                  <input
                    name="source"
                    placeholder="Google, referral, Facebook, walk-in..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Next follow-up
                  </label>
                  <input
                    name="nextFollowUpDate"
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
                  placeholder="Context, estimate details, customer request, objections, urgency, or next step..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Save {profile.labels.leadSingular.toLowerCase()}
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Pipeline health"
            description="A quick look at where records are sitting and what needs attention."
          >
            <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">
                  Estimate sent value
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {formatCurrency(estimateSentValue)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Value sitting in records marked Estimate Sent.
                </p>
              </div>

              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">
                  Stale open records
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {staleOpenLeads}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Open records older than 14 days.
                </p>
              </div>

              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">
                  Data cleanup
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {missingCustomer + missingSource + missingValue}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Missing customer, source, or estimated value.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 p-5">
              <p className="text-sm font-semibold text-slate-950">
                Status breakdown
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {statusColumns.map((column) => (
                  <div
                    key={column.status}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {column.status}
                      </p>
                      <StatusBadge tone={getStatusTone(column.status)}>
                        {column.count}
                      </StatusBadge>
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      {formatCurrency(column.value)}
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
            description="Fix these items to make reports, AI summaries, and pipeline prioritization more useful."
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
            title="Highest value open records"
            description={`Open ${profile.labels.leadPlural.toLowerCase()} sorted by estimated value.`}
          >
            {highestValueLeads.length === 0 ? (
              <EmptyState
                title="No open value yet"
                description={`Add estimated values to open ${profile.labels.leadPlural.toLowerCase()} to prioritize follow-up.`}
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {highestValueLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="grid gap-4 p-5 md:grid-cols-[1fr_140px_140px]"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {lead.service_requested || "Untitled record"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {getCustomerName(lead.customers)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Status
                      </p>
                      <div className="mt-1">
                        <StatusBadge tone={getStatusTone(lead.status)}>
                          {lead.status || "Unknown"}
                        </StatusBadge>
                      </div>
                    </div>

                    <div className="md:text-right">
                      <p className="text-xs font-medium text-slate-500">
                        Value
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {formatCurrency(lead.estimated_value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <SectionCard
          title={`${profile.labels.leadPlural} records`}
          description="Clean pipeline records with status, source, value, follow-up dates, and relationship context."
        >
          {leadRecords.length === 0 ? (
            <EmptyState
              title={`No ${profile.labels.leadPlural.toLowerCase()} yet`}
              description={`Add your first ${profile.labels.leadSingular.toLowerCase()} to begin tracking pipeline movement and follow-up.`}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {leadRecords.map((lead) => (
                <article
                  key={lead.id}
                  className="grid gap-4 p-5 md:grid-cols-[1.2fr_1fr_1fr_130px_90px]"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {lead.service_requested || "Untitled record"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {getCustomerName(lead.customers)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Source / value
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {lead.source || "No source"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatCurrency(lead.estimated_value)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Follow-up
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {formatDate(lead.next_follow_up_date)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Added {formatDate(lead.created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Status</p>
                    <div className="mt-2">
                      <StatusBadge tone={getStatusTone(lead.status)}>
                        {lead.status || "Unknown"}
                      </StatusBadge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Link
                      href={`/leads/${lead.id}/edit`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </Link>

                    <form action={deleteLeadAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <button className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
                        Delete
                      </button>
                    </form>
                  </div>

                  {lead.notes && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-5">
                      <p className="text-xs font-medium text-slate-500">
                        Notes
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {lead.notes}
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
