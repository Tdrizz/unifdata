import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany, getCurrentCompanyId } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";

async function updateCustomerAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const customerId = String(formData.get("customerId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const customerType = String(formData.get("customerType") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!customerId) {
    throw new Error("Customer ID is required.");
  }

  if (!name) {
    throw new Error("Name is required.");
  }

  const supabase = await createClient();

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
    .eq("id", customerId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/customers");
  revalidatePath("/workspace");
  revalidatePath("/crm");
  revalidatePath("/data-hub");

  redirect("/customers");
}

export default async function EditCustomerPage({
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

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, name, phone, email, address, customer_type, notes")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();

  if (error || !customer) {
    redirect("/customers");
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
          title={`Edit ${profile.labels.customerSingular.toLowerCase()}`}
          description="Update contact details, address, type, and notes so reporting and follow-ups stay accurate."
          actions={
            <Link
              href="/customers"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to {profile.labels.customerPlural.toLowerCase()}
            </Link>
          }
        />

        <SectionCard
          title="Record details"
          description="Changes saved here update the customer record across the workspace."
        >
          <form action={updateCustomerAction} className="space-y-4 p-5">
            <input type="hidden" name="customerId" value={customer.id} />

            <div>
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input
                name="name"
                required
                defaultValue={customer.name || ""}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Phone
                </label>
                <input
                  name="phone"
                  defaultValue={customer.phone || ""}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={customer.email || ""}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Address
              </label>
              <input
                name="address"
                defaultValue={customer.address || ""}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Type</label>
              <input
                name="customerType"
                defaultValue={customer.customer_type || ""}
                placeholder="Residential, Commercial, Patient, Client, Prospect..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Notes
              </label>
              <textarea
                name="notes"
                rows={5}
                defaultValue={customer.notes || ""}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Save changes
              </button>

              <Link
                href="/customers"
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
