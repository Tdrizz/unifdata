import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getCustomersPageData } from "@/features/customers/queries";
import { CustomersList } from "@/features/customers/components/CustomersList";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const page = Number(params.page ?? 1);
  const { customers, count } = await getCustomersPageData(supabase, company.id, { q: params.q, page });

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Link href="/workspace" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Home</Link>
      <Link href="/leads" className="rounded-2xl bg-[#1D2D3E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a3f57]">{profile.labels.leadPlural}</Link>
    </div>
  );

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
          eyebrow={profile.labels.customerPlural}
          title={`${profile.labels.customerPlural} and businesses`}
          description={`Manage ${profile.labels.customerSingular.toLowerCase()} records and quickly see which contact fields are missing.`}
          actions={actions}
        />
        <CustomersList customers={customers} count={count} profile={profile} errorParam={params.error} />
      </div>
    </AppShell>
  );
}
