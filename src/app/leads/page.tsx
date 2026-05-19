import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getLeadsPageData, getCustomersForLeadSelect } from "@/features/leads/queries";
import { LeadsList } from "@/features/leads/components/LeadsList";

export const dynamic = 'force-dynamic';

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const page = Number(params.page ?? 1);

  const [{ leads, count }, customers] = await Promise.all([
    getLeadsPageData(supabase, company.id, { q: params.q, page }),
    getCustomersForLeadSelect(supabase, company.id),
  ]);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <LeadsList
        leads={leads}
        count={count}
        customers={customers}
        profile={profile}
      />
    </AppShell>
  );
}
