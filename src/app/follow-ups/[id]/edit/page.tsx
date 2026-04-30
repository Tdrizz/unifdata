import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany, getCurrentCompanyId } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";

const followUpStatuses = ["Open", "Completed"];

async function updateFollowUpAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const followUpId = String(formData.get("followUpId") || "").trim();
  const customerId = String(formData.get("customerId") || "").trim();
  const leadId = String(formData.get("leadId") || "").trim();
  const dueDate = String(formData.get("dueDate") || "").trim();
  const status = String(formData.get("status") || "Open").trim();
  const message = String(formData.get("message") || "").trim();

  if (!followUpId) {
    throw new Error("Follow-up ID is required.");
  }

  if (!message) {
    throw new Error("Follow-up message is required.");
  }

  if (!dueDate) {
    throw new Error("Due date is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .update({
      customer_id: customerId || null,
      lead_id: leadId || null,
      due_date: dueDate,
      status: status || "Open",
      message,
    })
    .eq("id", followUpId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/follow-ups");
  revalidatePath("/workspace");
  revalidatePath("/crm");
  revalidatePath("/data-hub");
  revalidatePath("/ai-assistant");

  redirect("/follow-ups");
}

export default async function EditFollowUpPage({
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

  const { data: followUp, error: followUpError } = await supabase
    .from("follow_ups")
    .select("id, customer_id, lead_id, due_date, status, message")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();

  if (followUpError || !followUp) {
    redirect("/follow-ups");
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
    .select("id, service_requested, estimated_value, status")
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
          eyebrow="Edit action"
          title="Edit follow-up"
          description="Update the action, due date, status, and linked records so the action queue stays accurate."
          actions={
            <Link
              href="/follow-ups"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to action queue
            </Link>
          }
        />

        <SectionCard
          title="Follow-up details"
          description="Changes saved here update Today, Relationships, Data Hub, and AI summaries."
        >
          <form action={updateFollowUpAction} className="space-y-4 p-5">
            <input type="hidden" name="followUpId" value={followUp.id} />

            <div>
              <label className="text-sm font-medium text-slate-700">
                {profile.labels.customerSingular}
              </label>
              <select
                name="customerId"
                defaultValue={followUp.customer_id || ""}
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
                defaultValue={followUp.lead_id || ""}
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Due date
                </label>
                <input
                  name="dueDate"
                  type="date"
                  required
                  defaultValue={followUp.due_date || ""}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={followUp.status || "Open"}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {followUpStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Action
              </label>
              <textarea
                name="message"
                rows={5}
                required
                defaultValue={followUp.message || ""}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Save changes
              </button>

              <Link
                href="/follow-ups"
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
