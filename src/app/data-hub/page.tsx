import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getDataHubPageData, getPendingProposals } from "@/features/data-hub/queries";
import { DataHubView } from "@/features/data-hub/components/DataHubView";

export const dynamic = 'force-dynamic';

export default async function DataHubPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const currentCompany = await getCurrentCompany();

  if (!currentCompany) {
    redirect("/onboarding");
  }

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const [data, proposals] = await Promise.all([
    getDataHubPageData(supabase, company.id),
    getPendingProposals(supabase, company.id),
  ]);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <DataHubView {...data} profile={profile} proposals={proposals} />
    </AppShell>
  );
}
