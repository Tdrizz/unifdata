import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { findDuplicateCustomers } from "@/features/customers/queries";
import { DuplicatesPage } from "@/features/customers/components/DuplicatesPage";

export const dynamic = 'force-dynamic';

export default async function CustomerDuplicatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const groups = await findDuplicateCustomers(company.id);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#1D2D3E"}
      accentColor={company.accent_color || "#4A3FA8"}
      businessSector={company.business_sector}
    >
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Duplicate Customers</h1>
            <p className="mt-1 text-sm text-slate-500">{groups.length} duplicate group{groups.length !== 1 ? "s" : ""} found</p>
          </div>
          <a href="/customers" className="text-sm text-slate-500 hover:underline">← Back to Customers</a>
        </div>
        <DuplicatesPage groups={groups} />
      </div>
    </AppShell>
  );
}
