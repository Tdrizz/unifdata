import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getFollowUpPageData } from "@/features/follow-ups/queries";
import { FollowUpsView } from "@/features/follow-ups/components/FollowUpsView";
import { FollowUpViewToggle } from "@/features/follow-ups/components/FollowUpViewToggle";

export const dynamic = 'force-dynamic';

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; due?: string; source?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const data = await getFollowUpPageData(supabase, company.id);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#1D2D3E"}
      accentColor={company.accent_color || "#4A3FA8"}
      businessSector={company.business_sector}
    >
      {/* Desktop view */}
      <FollowUpsView
        followUps={data.followUps}
        opportunities={data.opportunities}
        people={data.people}
        profile={profile}
      />

      {/* Mobile view */}
      <div className="block md:hidden space-y-5 px-4 pt-5 pb-8">
        <FollowUpViewToggle
          followUps={data.followUps}
          opportunities={data.opportunities}
          people={data.people}
          filters={{ status: params.status, due: params.due, source: params.source }}
          profile={profile}
        />
      </div>
    </AppShell>
  );
}
