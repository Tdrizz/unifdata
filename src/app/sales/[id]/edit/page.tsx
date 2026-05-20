import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { formatCurrency } from "@/lib/utils";
import { getSaleById, getCustomersForSaleSelect } from "@/features/sales/queries";
import { SaleForm } from "@/features/sales/components/SaleForm";

export const dynamic = 'force-dynamic';

export default async function EditRevenuePage({
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

  const [sale, customers] = await Promise.all([
    getSaleById(supabase, company.id, id),
    getCustomersForSaleSelect(supabase, company.id),
  ]);

  if (!sale) redirect("/sales");

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
    >
      <div className="space-y-5 px-6 pt-5 pb-8">
        <PageHeader
          eyebrow={`Edit ${profile.labels.saleSingular.toLowerCase()}`}
          title={sale.service_type || formatCurrency(sale.amount)}
          description={`Update amount, payment status, ${profile.labels.saleSingular.toLowerCase()} date, source, and service category.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/sales" className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk">
                Back to {profile.labels.salePlural}
              </Link>
              <Link href="/jobs" className="rounded-[10px] bg-ud-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                {profile.labels.jobPlural}
              </Link>
            </div>
          }
        />
        <SaleForm sale={sale} customers={customers} />
      </div>
    </AppShell>
  );
}
