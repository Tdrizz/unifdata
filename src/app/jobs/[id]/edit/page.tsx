import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany, getCurrentCompanyId } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";

const jobStatuses = [
  "Scheduled",
  "In Progress",
  "Completed",
  "Paid",
  "Cancelled",
];

const paidStatuses = ["Unpaid", "Partial", "Paid"];

async function updateJobAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const jobId = String(formData.get("jobId") || "").trim();
  const customerId = String(formData.get("customerId") || "").trim();
  const leadId = String(formData.get("leadId") || "").trim();
  const serviceType = String(formData.get("serviceType") || "").trim();
  const status = String(formData.get("status") || "Scheduled").trim();
  const jobValue = String(formData.get("jobValue") || "").trim();
  const startDate = String(formData.get("startDate") || "").trim();
  const completedDate = String(formData.get("completedDate") || "").trim();
  const paidStatus = String(formData.get("paidStatus") || "Unpaid").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!jobId) {
    throw new Error("Job ID is required.");
  }

  if (!serviceType) {
    throw new Error("Work / service type is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("jobs")
    .update({
      customer_id: customerId || null,
      lead_id: leadId || null,
      service_type: serviceType,
      status: status || "Scheduled",
      job_value: jobValue ? Number(jobValue) : null,
      start_date: startDate || null,
      completed_date: completedDate || null,
      paid_status: paidStatus || "Unpaid",
      notes: notes || null,
    })
    .eq("id", jobId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/jobs");
  revalidatePath("/workspace");
  revalidatePath("/crm");
  revalidatePath("/sales");
  revalidatePath("/data-hub");
  revalidatePath("/ai-assistant");

  redirect("/jobs");
}

export default async function EditJobPage({
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
  const profile = getIndustryProfile(company.business_sector);

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(
      "id, customer_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, notes",
    )
    .eq("id", id)
    .eq("company_id", company.id)
    .single();

  if (jobError || !job) {
    redirect("/jobs");
  }

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
    .select("id, service_requested, estimated_value")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Edit record"
          title={`Edit ${profile.labels.jobSingular.toLowerCase()}`}
          description="Update work status, payment status, value, dates, notes, and linked records so operations stay accurate."
          actions={
            <Link
              href="/jobs"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to {profile.labels.jobPlural.toLowerCase()}
            </Link>
          }
        />

        <SectionCard
          title="Work details"
          description="Changes saved here update Today, Data Hub, Sales, and AI summaries."
        >
          <form action={updateJobAction} className="space-y-4 p-5">
            <input type="hidden" name="jobId" value={job.id} />

            <div>
              <label className="text-sm font-medium text-slate-700">
                {profile.labels.customerSingular}
              </label>
              <select
                name="customerId"
                defaultValue={job.customer_id || ""}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">No customer linked</option>
                {(customers || []).map((customer) => (
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
                defaultValue={job.lead_id || ""}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">No opportunity linked</option>
                {(leads || []).map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.service_requested} — $
                    {Number(lead.estimated_value || 0).toLocaleString()}
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
                defaultValue={job.service_type || ""}
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
                  defaultValue={job.status || "Scheduled"}
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
                  defaultValue={job.paid_status || "Unpaid"}
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
                defaultValue={job.job_value || ""}
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
                  defaultValue={job.start_date || ""}
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
                  defaultValue={job.completed_date || ""}
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
                rows={5}
                defaultValue={job.notes || ""}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Save changes
              </button>

              <Link
                href="/jobs"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </SectionCard>
      </div>
    </AppShell>
  );
}
