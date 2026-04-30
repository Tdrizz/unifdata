import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany, getCurrentCompanyId } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";

const leadStatuses = [
  "New",
  "Contacted",
  "Estimate Sent",
  "Needs Follow-Up",
  "Won",
  "Lost",
];

async function updateLeadAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const leadId = String(formData.get("leadId") || "").trim();
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

  if (!leadId) {
    throw new Error("Lead ID is required.");
  }

  if (!serviceRequested) {
    throw new Error("Request / service is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("leads")
    .update({
      customer_id: customerId || null,
      service_requested: serviceRequested,
      status: status || "New",
      estimated_value: estimatedValue ? Number(estimatedValue) : null,
      source: source || null,
      next_follow_up_date: nextFollowUpDate || null,
      notes: notes || null,
    })
    .eq("id", leadId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/leads");
  revalidatePath("/crm");
  revalidatePath("/workspace");
  revalidatePath("/data-hub");

  redirect("/leads");
}

export default async function EditLeadPage({
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

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(
      "id, customer_id, service_requested, status, estimated_value, source, next_follow_up_date, notes",
    )
    .eq("id", id)
    .eq("company_id", company.id)
    .single();

  if (leadError || !lead) {
    redirect("/leads");
  }

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name")
    .eq("company_id", company.id)
    .order("name", { ascending: true });

  if (customersError) {
    throw new Error(customersError.message);
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
          title={`Edit ${profile.labels.leadSingular.toLowerCase()}`}
          description="Update status, source, estimated value, follow-up date, and notes so the pipeline stays accurate."
          actions={
            <Link
              href="/leads"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to {profile.labels.leadPlural.toLowerCase()}
            </Link>
          }
        />

        <SectionCard
          title="Pipeline details"
          description="Changes saved here update CRM, Today, Data Hub, and AI summaries."
        >
          <form action={updateLeadAction} className="space-y-4 p-5">
            <input type="hidden" name="leadId" value={lead.id} />

            <div>
              <label className="text-sm font-medium text-slate-700">
                {profile.labels.customerSingular}
              </label>
              <select
                name="customerId"
                defaultValue={lead.customer_id || ""}
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
                Request / service
              </label>
              <input
                name="serviceRequested"
                required
                defaultValue={lead.service_requested || ""}
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
                  defaultValue={lead.status || "New"}
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
                  defaultValue={lead.estimated_value || ""}
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
                  defaultValue={lead.source || ""}
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
                  defaultValue={lead.next_follow_up_date || ""}
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
                defaultValue={lead.notes || ""}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Save changes
              </button>

              <Link
                href="/leads"
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
