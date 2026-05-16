import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getCRMPageData } from "@/features/crm/queries";
import { CRMView } from "@/features/crm/components/CRMView";
import { MobileCrmView } from "@/features/crm/components/MobileCrmView";

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const { leads, customers } = await getCRMPageData(supabase, company.id);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#1D2D3E"}
      accentColor={company.accent_color || "#4A3FA8"}
      businessSector={company.business_sector}
    >
      <>
        <CRMView leads={leads} customers={customers} />
        <MobileCrmView leads={leads} customers={customers} />
      </>
    </AppShell>
  );
}
