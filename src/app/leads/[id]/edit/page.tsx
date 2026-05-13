import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getLeadById, getCustomersForLeadSelect } from "@/features/leads/queries";
import { LeadForm } from "@/features/leads/components/LeadForm";

export default async function EditOpportunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorParam } = await searchParams;

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
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
      businessSector={company.business_sector}
    >
      <LeadForm
        lead={lead}
        customers={customers}
        profile={profile}
        errorParam={errorParam}
      />
    </AppShell>
  );
}
