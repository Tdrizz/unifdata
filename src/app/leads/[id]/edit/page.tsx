import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getLeadById } from "@/features/leads/queries";
import { getContactForSelect } from "@/lib/crm/contacts";
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

  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

  const lead = await getLeadById(supabase, company.id, id);
  if (!lead) redirect("/crm");

  const linkedContact = await getContactForSelect(supabase, company.id, lead.contact_id ?? lead.customer_id);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <LeadForm
        lead={lead}
        linkedContact={linkedContact}
        profile={profile}
      />
    </AppShell>
  );
}
