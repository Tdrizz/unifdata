import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getSalesPageData } from "@/features/sales/queries";
import { SalesList } from "@/features/sales/components/SalesList";

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; error?: string }>;
}) {
  const params = await searchParams;
  const selectedStatus = params.status ? decodeURIComponent(params.status) : "";
  const selectedSource = params.source ? decodeURIComponent(params.source) : "";
  const errorParam = params.error ? decodeURIComponent(params.error) : "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const { sales } = await getSalesPageData(supabase, company.id);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
      businessSector={company.business_sector}
    >
      <SalesList
        sales={sales}
        profile={profile}
        selectedStatus={selectedStatus}
        selectedSource={selectedSource}
        errorParam={errorParam}
      />
    </AppShell>
  );
}
