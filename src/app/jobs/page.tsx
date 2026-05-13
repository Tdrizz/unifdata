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

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; stage?: string; error?: string }>;
}) {
  const params = await searchParams;
  const selectedStage = params.stage ? decodeURIComponent(params.stage) : "";
  const errorParam = params.error ? decodeURIComponent(params.error) : "";
  const page = Number(params.page ?? 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
      businessSector={company.business_sector}
    >
      <JobsList
        jobs={jobs}
        count={count}
        customers={customers}
        leads={leads}
        profile={profile}
        selectedStage={selectedStage}
        errorParam={errorParam}
      />
    </AppShell>
  );
}
