import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getPipelinePageData } from "@/features/pipeline/queries";
import { PipelineView } from "@/features/pipeline/components/PipelineView";
import { MobilePipelineView } from "@/features/pipeline/components/MobilePipelineView";
import { getLeadsForJobSelect } from "@/features/jobs/queries";
import { getJobsForSaleSelect } from "@/features/sales/queries";

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const [pipelineData, jobPickerLeads, leadPickerJobs] = await Promise.all([
    getPipelinePageData(supabase, company.id),
    getLeadsForJobSelect(supabase, company.id),
    getJobsForSaleSelect(supabase, company.id),
  ]);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <>
        <RealtimeRefresh
          orgId={company.id}
          tables={[
            { table: "leads" },
            { table: "jobs" },
            { table: "sales" },
            { table: "follow_ups" },
          ]}
        />
        <PipelineView
          {...pipelineData}
          profile={profile}
          jobPickerLeads={jobPickerLeads}
          leadPickerJobs={leadPickerJobs}
        />
        <MobilePipelineView
          {...pipelineData}
          profile={profile}
          jobPickerLeads={jobPickerLeads}
          leadPickerJobs={leadPickerJobs}
        />
      </>
    </AppShell>
  );
}
