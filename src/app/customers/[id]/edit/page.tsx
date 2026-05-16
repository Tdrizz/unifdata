import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getCustomerById, getCustomerLinkedCounts } from "@/features/customers/queries";
import { CustomerForm } from "@/features/customers/components/CustomerForm";

export const dynamic = 'force-dynamic';

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const customer = await getCustomerById(supabase, company.id, id);
  if (!customer) redirect("/customers");

  const { leadsCount, jobsCount, followUpsCount } = await getCustomerLinkedCounts(supabase, company.id, id);

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Link href="/customers" className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk">Back to People</Link>
      <Link href="/leads" className="rounded-[10px] bg-ud-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity">Opportunities</Link>
    </div>
  );

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#1D2D3E"}
      accentColor={company.accent_color || "#4A3FA8"}
      businessSector={company.business_sector}
    >
      <div className="space-y-5 px-6 pt-5 pb-8">
        <PageHeader
          eyebrow={`Edit ${profile.labels.customerSingular.toLowerCase()}`}
          title={customer.name || `Unnamed ${profile.labels.customerSingular.toLowerCase()}`}
          description="Update contact details, address, type, and notes for this person or business."
          actions={actions}
        />
        <CustomerForm customer={customer} leadsCount={leadsCount} jobsCount={jobsCount} followUpsCount={followUpsCount} profile={profile} errorParam={errorParam} />
      </div>
    </AppShell>
  );
}
