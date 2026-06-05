import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { AppShell } from "@/components/AppShell";
import { DesktopRedirect } from "@/components/DesktopRedirect";
import { MobileCustomerDetail } from "@/features/customers/MobileCustomerDetail";
import { getIndustryProfile } from "@/lib/industry-profiles";
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
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

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
      .select("id, customer_id, status, estimated_value, service_requested, source, next_follow_up_date, created_at")
      .eq("customer_id", id)
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("jobs")
      .select("id, customer_id, status, job_value, service_type, start_date, completed_date, paid_status, created_at")
      .eq("customer_id", id)
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("sales")
      .select("id, customer_id, amount, payment_status, sale_date, service_type, created_at")
      .eq("customer_id", id)
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (customerError || !customer) redirect("/customers");

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
      hideMobileHeader
    >
      {/* Mobile view */}
      <div className="block md:hidden">
        <MobileCustomerDetail
          customer={customer as CustomerRow}
          leads={(leads ?? []) as LeadRow[]}
          jobs={(jobs ?? []) as JobRow[]}
          sales={(sales ?? []) as SaleRow[]}
          profile={profile}
        />
      </div>
      {/* Desktop: immediately redirect to edit page */}
      <DesktopRedirect to={`/customers/${id}/edit`} />
    </AppShell>
  );
}
