import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import {
  getJobsPageData,
  getCustomersForJobSelect,
  getLeadsForJobSelect,
} from "@/features/jobs/queries";
import { JobsList } from "@/features/jobs/components/JobsList";
import { MobileJobsList } from "@/features/jobs/components/MobileJobsList";

export const dynamic = 'force-dynamic';

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; stage?: string }>;
}) {
  const params = await searchParams;
  const selectedStage = params.stage ? decodeURIComponent(params.stage) : "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

  const [{ jobs, count }, customers, leads] = await Promise.all([
    getJobsPageData(supabase, company.id, { q: params.q, page }),
    getCustomersForJobSelect(supabase, company.id),
    getLeadsForJobSelect(supabase, company.id),
  ]);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <JobsList
        jobs={jobs}
        count={count}
        customers={customers}
        leads={leads}
        profile={profile}
        selectedStage={selectedStage}
      />
      <div className="block md:hidden">
        <MobileJobsList
          jobs={jobs}
          count={count}
          customers={customers}
          leads={leads}
          profile={profile}
          selectedStage={selectedStage}
        />
      </div>
    </AppShell>
  );
}
