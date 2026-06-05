import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getSalesPageData, getCustomersForSaleSelect } from "@/features/sales/queries";
import { SalesList } from "@/features/sales/components/SalesList";
import { MobileSalesView } from "@/features/sales/components/MobileSalesView";

export const dynamic = 'force-dynamic';

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const selectedStatus = params.status ? decodeURIComponent(params.status) : "";
  const selectedSource = params.source ? decodeURIComponent(params.source) : "";
  const page = Number(params.page ?? 1);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const [{ sales, count }, contacts] = await Promise.all([
    getSalesPageData(supabase, company.id, { q: params.q, page }),
    getCustomersForSaleSelect(supabase, company.id),
  ]);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <MobileSalesView sales={sales} profile={profile} contacts={contacts} />
      <SalesList
        sales={sales}
        count={count}
        page={page}
        q={params.q}
        profile={profile}
        selectedStatus={selectedStatus}
        selectedSource={selectedSource}
        contacts={contacts}
      />
    </AppShell>
  );
}
