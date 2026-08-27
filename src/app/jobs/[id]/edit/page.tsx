import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getJobById, getLeadsForJobSelect } from "@/features/jobs/queries";
import { getContactForSelect } from "@/lib/crm/contacts";
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
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

  const [job, leads] = await Promise.all([
    getJobById(supabase, company.id, id),
    getLeadsForJobSelect(supabase, company.id),
  ]);

  if (!job) redirect("/crm");

  const linkedContact = await getContactForSelect(supabase, company.id, job.contact_id ?? job.customer_id);

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
            <Link href="/crm" className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk">
              Back to Pipeline
            </Link>
          }
        />
        <JobForm job={job} linkedContact={linkedContact} leads={leads} profile={profile} />
      </div>
    </AppShell>
  );
}
