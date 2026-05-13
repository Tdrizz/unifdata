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

export default async function EditRevenuePage({
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

  const [sale, customers] = await Promise.all([
    getSaleById(supabase, company.id, id),
    getCustomersForSaleSelect(supabase, company.id),
  ]);

  if (!sale) redirect("/sales");

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
      businessSector={company.business_sector}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow={`Edit ${profile.labels.saleSingular.toLowerCase()}`}
          title={sale.service_type || formatCurrency(sale.amount)}
          description={`Update amount, payment status, ${profile.labels.saleSingular.toLowerCase()} date, source, and service category.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/sales" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Back to Revenue
              </Link>
              <Link href="/jobs" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Work
              </Link>
            </div>
          }
        />
        <SaleForm sale={sale} customers={customers} errorParam={errorParam} />
      </div>
    </AppShell>
  );
}
