import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getFollowUpPageData } from "@/features/follow-ups/queries";
import { FollowUpViewToggle } from "@/features/follow-ups/components/FollowUpViewToggle";
import { FollowUpCreateForm } from "@/features/follow-ups/components/FollowUpCreateForm";

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
      <div className="space-y-5 px-4 md:px-6 pt-5 pb-8">
        <PageHeader
          eyebrow={profile.labels.followUpPlural}
          title="Priority follow-up queue"
          description={`Manual follow-ups and ${profile.labels.leadSingular.toLowerCase()} follow-up dates are sorted by urgency and due date.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/leads" className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk">Opportunities</Link>
              <Link href="/imports" className="rounded-[10px] bg-ud-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity">Import data</Link>
            </div>
          }
        />
        <FollowUpCreateForm
          people={data.people}
        />
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
