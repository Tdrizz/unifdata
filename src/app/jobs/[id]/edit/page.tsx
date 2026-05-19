import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getJobById, getCustomersForJobSelect, getLeadsForJobSelect } from "@/features/jobs/queries";
import { JobForm } from "@/features/jobs/components/JobForm";

export const dynamic = 'force-dynamic';

export default async function EditWorkPage({
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

  const [job, customers, leads] = await Promise.all([
    getJobById(supabase, company.id, id),
    getCustomersForJobSelect(supabase, company.id),
    getLeadsForJobSelect(supabase, company.id),
  ]);

  if (!job) redirect("/jobs");

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <div className="space-y-5 px-6 pt-5 pb-8">
        <PageHeader
          eyebrow={`Edit ${profile.labels.jobSingular.toLowerCase()}`}
          title={job.service_type || `Untitled ${profile.labels.jobSingular.toLowerCase()}`}
          description={`Update the linked ${profile.labels.customerSingular.toLowerCase()}, ${profile.labels.leadSingular.toLowerCase()}, stage, payment status, dates, and value.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/jobs" className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk">
                Back to {profile.labels.jobPlural}
              </Link>
              <Link href="/sales" className="rounded-[10px] bg-ud-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                {profile.labels.salePlural}
              </Link>
            </div>
          }
        />
        <JobForm job={job} customers={customers} leads={leads} profile={profile} />
      </div>
    </AppShell>
  );
}
