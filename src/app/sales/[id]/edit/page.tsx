import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { formatCurrency } from "@/lib/utils";
import { getSaleById, getJobsForSaleSelect } from "@/features/sales/queries";
import { getContactForSelect } from "@/lib/crm/contacts";
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

  const [sale, jobs] = await Promise.all([
    getSaleById(supabase, company.id, id),
    getJobsForSaleSelect(supabase, company.id),
  ]);

  if (!sale) redirect("/sales");

  const linkedContact = await getContactForSelect(supabase, company.id, sale.contact_id ?? sale.customer_id);

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
            <Link href="/sales" className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk">
              Back to {profile.labels.salePlural}
            </Link>
          }
        />
        <SaleForm sale={sale} linkedContact={linkedContact} jobs={jobs} />
      </div>
    </AppShell>
  );
}
