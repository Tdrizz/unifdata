import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getWorkspaceData } from "@/features/workspace/queries";
import { WorkspaceView } from "@/features/workspace/components/WorkspaceView";
import { MobileWorkspaceView } from "@/features/workspace/components/MobileWorkspaceView";

export const dynamic = 'force-dynamic';

export default async function WorkspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const data = await getWorkspaceData(supabase, company.id);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#1D2D3E"}
      accentColor={company.accent_color || "#4A3FA8"}
      businessSector={company.business_sector}
    >
      <>
        <WorkspaceView {...data} profile={profile} companyName={company.name} />
        <MobileWorkspaceView {...data} profile={profile} companyName={company.name} />
      </>
    </AppShell>
  );
}
