import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getFollowUpById, getLeadsForFollowUpSelect } from "@/features/follow-ups/queries";
import { getContactForSelect } from "@/lib/crm/contacts";
import { FollowUpForm } from "@/features/follow-ups/components/FollowUpForm";

export const dynamic = 'force-dynamic';

export default async function EditFollowUpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

  const [followUp, leads] = await Promise.all([
    getFollowUpById(supabase, company.id, id),
    getLeadsForFollowUpSelect(supabase, company.id),
  ]);

  if (!followUp) redirect("/crm");

  const linkedContact = await getContactForSelect(supabase, company.id, followUp.contact_id ?? followUp.customer_id);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <div className="px-6 pt-5">
        <PageHeader eyebrow={profile.labels.followUpPlural} title="Edit follow-up" />
      </div>
      <FollowUpForm followUp={followUp} linkedContact={linkedContact} leads={leads} profile={profile} />
    </AppShell>
  );
}
