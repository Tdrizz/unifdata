import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getCustomersPageData } from "@/features/customers/queries";
import { CustomersList } from "@/features/customers/components/CustomersList";
import { CustomersTableClient } from "@/features/customers/components/CustomersTableClient";
import type { Database } from "@/types/db";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];

export const dynamic = 'force-dynamic';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const page = Number(params.page ?? 1);

  // Fetch customers + related data in parallel
  const [customersResult, jobsResult, leadsResult, salesResult] = await Promise.all([
    getCustomersPageData(supabase, company.id, { q: params.q, page }),
    supabase
      .from("jobs")
      .select("id, customer_id, status, completed_date, job_value, lead_id, company_id, created_at, notes, paid_status, service_type, start_date, updated_at")
      .eq("company_id", company.id)
      .limit(500),
    supabase
      .from("leads")
      .select("id, customer_id, status, estimated_value, company_id, created_at, next_follow_up_date, notes, service_requested, source, updated_at")
      .eq("company_id", company.id)
      .limit(500),
    supabase
      .from("sales")
      .select("id, customer_id, amount, sale_date, company_id, created_at, job_id, payment_status, service_type, source")
      .eq("company_id", company.id)
      .limit(500),
  ]);

  const { customers } = customersResult;
  const jobs = (jobsResult.data ?? []) as JobRow[];
  const leads = (leadsResult.data ?? []) as LeadRow[];
  const sales = (salesResult.data ?? []) as SaleRow[];

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      {/* Desktop view */}
      <CustomersTableClient
        customers={customers}
        jobs={jobs}
        leads={leads}
        sales={sales}
        profile={profile}
      />

      {/* Mobile view */}
      <CustomersList
        customers={customers}
        jobs={jobs}
        leads={leads}
        sales={sales}
        profile={profile}
      />
    </AppShell>
  );
}
