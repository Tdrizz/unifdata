import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getFollowUpById, getCustomersForSelect } from "@/features/follow-ups/queries";
import { FollowUpForm } from "@/features/follow-ups/components/FollowUpForm";

export default async function EditFollowUpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

  const [followUp, people] = await Promise.all([
    getFollowUpById(supabase, company.id, id),
    getCustomersForSelect(supabase, company.id),
  ]);

  if (!followUp) redirect("/follow-ups");

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
      businessSector={company.business_sector}
    >
      <PageHeader eyebrow={profile.labels.followUpPlural} title="Edit follow-up" />
      <FollowUpForm followUp={followUp} people={people} profile={profile} />
    </AppShell>
  );
}
