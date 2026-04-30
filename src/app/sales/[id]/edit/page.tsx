import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany, getCurrentCompanyId } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";

const paymentStatuses = ["Paid", "Partial", "Unpaid"];

async function updateSaleAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const saleId = String(formData.get("saleId") || "").trim();
  const customerId = String(formData.get("customerId") || "").trim();
  const jobId = String(formData.get("jobId") || "").trim();
  const amount = String(formData.get("amount") || "").trim();
  const paymentStatus = String(formData.get("paymentStatus") || "Paid").trim();
  const saleDate = String(formData.get("saleDate") || "").trim();
  const serviceType = String(formData.get("serviceType") || "").trim();
  const source = String(formData.get("source") || "").trim();

  if (!saleId) {
    throw new Error("Sale ID is required.");
  }

  if (!amount) {
    throw new Error("Amount is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("sales")
    .update({
      customer_id: customerId || null,
      job_id: jobId || null,
      amount: Number(amount),
      payment_status: paymentStatus || "Paid",
      sale_date: saleDate || new Date().toISOString().slice(0, 10),
      service_type: serviceType || null,
      source: source || null,
    })
    .eq("id", saleId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/sales");
  revalidatePath("/workspace");
  revalidatePath("/jobs");
  revalidatePath("/data-hub");
  revalidatePath("/ai-assistant");

  redirect("/sales");
}

export default async function EditSalePage({
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

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select(
      "id, customer_id, job_id, amount, payment_status, sale_date, service_type, source",
    )
    .eq("id", id)
    .eq("company_id", company.id)
    .single();

  if (saleError || !sale) {
    redirect("/sales");
  }

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name")
    .eq("company_id", company.id)
    .order("name", { ascending: true });

  if (customersError) {
    throw new Error(customersError.message);
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, service_type, job_value, status")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (jobsError) {
    throw new Error(jobsError.message);
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
          title={`Edit ${profile.labels.saleSingular.toLowerCase()}`}
          description="Update amount, payment status, service type, source, date, and linked records so revenue reporting stays accurate."
          actions={
            <Link
              href="/sales"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to {profile.labels.salePlural.toLowerCase()}
            </Link>
          }
        />

        <SectionCard
          title="Revenue details"
          description="Changes saved here update Today, Revenue, Data Hub, and AI summaries."
        >
          <form action={updateSaleAction} className="space-y-4 p-5">
            <input type="hidden" name="saleId" value={sale.id} />

            <div>
              <label className="text-sm font-medium text-slate-700">
                {profile.labels.customerSingular}
              </label>
              <select
                name="customerId"
                defaultValue={sale.customer_id || ""}
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
                Related {profile.labels.jobSingular.toLowerCase()}
              </label>
              <select
                name="jobId"
                defaultValue={sale.job_id || ""}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">No work record linked</option>
                {(jobs || []).map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.service_type} — $
                    {Number(job.job_value || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Amount
                </label>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={sale.amount || ""}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Payment status
                </label>
                <select
                  name="paymentStatus"
                  defaultValue={sale.payment_status || "Paid"}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {paymentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Sale date
              </label>
              <input
                name="saleDate"
                type="date"
                defaultValue={sale.sale_date || ""}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Service type
              </label>
              <input
                name="serviceType"
                defaultValue={sale.service_type || ""}
                placeholder="Mowing, repair, appointment, policy, project..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Source
              </label>
              <input
                name="source"
                defaultValue={sale.source || ""}
                placeholder="Google, referral, Facebook, repeat customer..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Save changes
              </button>

              <Link
                href="/sales"
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
