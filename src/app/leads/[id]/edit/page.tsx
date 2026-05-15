import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getLeadById, getCustomersForLeadSelect } from "@/features/leads/queries";
import { LeadForm } from "@/features/leads/components/LeadForm";

export const dynamic = 'force-dynamic';

export default async function EditOpportunityPage({
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
  const profile = getIndustryProfile(company.business_sector);

  const [lead, customers] = await Promise.all([
    getLeadById(supabase, company.id, id),
    getCustomersForLeadSelect(supabase, company.id),
  ]);

  if (!lead) redirect("/leads");

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#1D2D3E"}
      accentColor={company.accent_color || "#7A8C2A"}
      businessSector={company.business_sector}
    >
      <LeadForm
        lead={lead}
        customers={customers}
        profile={profile}
      />
    </AppShell>
  );
}
