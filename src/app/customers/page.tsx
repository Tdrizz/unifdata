import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getCustomersPageData } from "@/features/customers/queries";
import { CustomersList } from "@/features/customers/components/CustomersList";
import { CustomersTableClient } from "@/features/customers/components/CustomersTableClient";
import { CustomerCreateForm } from "@/features/customers/components/CustomerCreateForm";
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
  if (!user) redirect("/login");

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
      .eq("company_id", company.id),
    supabase
      .from("leads")
      .select("id, customer_id, status, estimated_value, company_id, created_at, next_follow_up_date, notes, service_requested, source, updated_at")
      .eq("company_id", company.id),
    supabase
      .from("sales")
      .select("id, customer_id, amount, sale_date, company_id, created_at, job_id, payment_status, service_type, source")
      .eq("company_id", company.id),
  ]);

  const { customers, count } = customersResult;
  const jobs = (jobsResult.data ?? []) as JobRow[];
  const leads = (leadsResult.data ?? []) as LeadRow[];
  const sales = (salesResult.data ?? []) as SaleRow[];

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#1D2D3E"}
      accentColor={company.accent_color || "#4A3FA8"}
      businessSector={company.business_sector}
    >
      {/* Desktop header — hidden on mobile (mobile header is inside CustomersList) */}
      <div className="hidden md:block px-6 pt-5 pb-8">
        <PageHeader
          eyebrow="Clients"
          title={`${count} clients`}
          description="Everyone you've sold to. Click a row to see quotes, visits, and payments."
          actions={
            <div className="flex items-center gap-2">
              <Link
                href="/imports"
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-3 py-2 text-[13px] font-semibold text-ud-muted hover:text-ud-ink transition-colors"
              >
                Import
              </Link>
            </div>
          }
          className="pb-5"
        />

        <CustomerCreateForm profile={profile} />

        <div className="mt-5">
          <CustomersTableClient
            customers={customers}
            jobs={jobs}
            leads={leads}
            sales={sales}
          />
        </div>
      </div>

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
