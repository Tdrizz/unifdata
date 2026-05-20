import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { findDuplicateCustomers } from "@/features/customers/queries";
import { DuplicatesPage } from "@/features/customers/components/DuplicatesPage";

export const dynamic = 'force-dynamic';

export default async function CustomerDuplicatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const { customerPlural } = profile.labels;

  const groups = await findDuplicateCustomers(company.id);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Duplicate {customerPlural}</h1>
            <p className="mt-1 text-sm text-slate-500">{groups.length} duplicate group{groups.length !== 1 ? "s" : ""} found</p>
          </div>
          <Link href="/customers" className="text-sm text-slate-500 hover:underline">← Back to {customerPlural}</Link>
        </div>
        <DuplicatesPage groups={groups} />
      </div>
    </AppShell>
  );
}
