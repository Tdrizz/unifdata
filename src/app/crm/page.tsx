import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getCRMPageData } from "@/features/crm/queries";
import { CRMView } from "@/features/crm/components/CRMView";
import { MobileCrmView } from "@/features/crm/components/MobileCrmView";

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const { leads, customers } = await getCRMPageData(supabase, company.id);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <>
        <CRMView leads={leads} customers={customers} profile={profile} />
        <MobileCrmView leads={leads} customers={customers} profile={profile} />
      </>
    </AppShell>
  );
}
