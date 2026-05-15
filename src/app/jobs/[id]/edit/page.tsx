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
      brandColor={company.brand_color || "#1D2D3E"}
      accentColor={company.accent_color || "#7A8C2A"}
      businessSector={company.business_sector}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow={`Edit ${profile.labels.jobSingular.toLowerCase()}`}
          title={job.service_type || `Untitled ${profile.labels.jobSingular.toLowerCase()}`}
          description={`Update the linked ${profile.labels.customerSingular.toLowerCase()}, ${profile.labels.leadSingular.toLowerCase()}, stage, payment status, dates, and value.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/jobs" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Back to Work
              </Link>
              <Link href="/sales" className="rounded-2xl bg-[#1D2D3E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a3f57]">
                Revenue
              </Link>
            </div>
          }
        />
        <JobForm job={job} customers={customers} leads={leads} profile={profile} />
      </div>
    </AppShell>
  );
}
