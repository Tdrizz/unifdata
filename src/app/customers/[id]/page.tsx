import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { AppShell } from "@/components/AppShell";
import { MobileCustomerDetail } from "@/features/customers/MobileCustomerDetail";
import type { Database } from "@/types/db";

export const dynamic = "force-dynamic";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;

  const [
    { data: customer, error: customerError },
    { data: leads },
    { data: jobs },
    { data: sales },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("company_id", company.id)
      .maybeSingle(),
    supabase
      .from("leads")
      .select("*")
      .eq("customer_id", id)
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("jobs")
      .select("*")
      .eq("customer_id", id)
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sales")
      .select("*")
      .eq("customer_id", id)
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),
  ]);

  if (customerError || !customer) redirect("/customers");

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#1D2D3E"}
      accentColor={company.accent_color || "#4A3FA8"}
      businessSector={company.business_sector}
    >
      {/* Mobile view */}
      <div className="block md:hidden">
        <MobileCustomerDetail
          customer={customer as CustomerRow}
          leads={(leads ?? []) as LeadRow[]}
          jobs={(jobs ?? []) as JobRow[]}
          sales={(sales ?? []) as SaleRow[]}
        />
      </div>
      {/* Desktop: redirect to edit page which has full UI */}
      <div className="hidden md:block p-6">
        <a
          href={`/customers/${id}/edit`}
          className="text-ud-accent text-sm font-semibold"
        >
          Edit customer →
        </a>
      </div>
    </AppShell>
  );
}
