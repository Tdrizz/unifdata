import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { AppShell } from "@/components/AppShell";
import { MobileCustomerDetail } from "@/features/customers/MobileCustomerDetail";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { DetailRow } from "@/components/ui/DetailRow";
import { ListRow } from "@/components/ui/ListRow";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Database } from "@/types/db";

export const dynamic = "force-dynamic";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

  const [
    { data: customer, error: customerError },
    { data: leads },
    { data: jobs },
    { data: sales },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("company_id", company.id)
      .maybeSingle(),
    supabase
      .from("leads")
      .select("id, customer_id, status, estimated_value, service_requested, source, next_follow_up_date, created_at")
      .eq("customer_id", id)
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("jobs")
      .select("id, customer_id, status, job_value, service_type, start_date, completed_date, paid_status, created_at")
      .eq("customer_id", id)
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("sales")
      .select("id, customer_id, amount, payment_status, sale_date, service_type, created_at")
      .eq("customer_id", id)
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (customerError || !customer) redirect("/customers");

  const c = customer as CustomerRow;
  const leadList = leads ?? [];
  const jobList = jobs ?? [];
  const saleList = sales ?? [];

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      businessSector={company.business_sector}
      hideMobileHeader
    >
      {/* Mobile view */}
      <div className="block md:hidden">
        <MobileCustomerDetail
          customer={c}
          leads={leadList as LeadRow[]}
          jobs={jobList as JobRow[]}
          sales={saleList as SaleRow[]}
          profile={profile}
        />
      </div>

      {/* Desktop view */}
      <div className="hidden md:block px-7 pb-10 pt-7">
        <PageHeader
          eyebrow="Edit customer"
          title={c.name}
          actions={
            <>
              <Link
                href="/customers"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-ud-surface border border-ud text-[13px] font-semibold text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-colors"
              >
                ← Back
              </Link>
              <Link
                href={`/customers/${id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-ud-ink text-white text-[13px] font-semibold hover:opacity-85 transition-opacity"
              >
                Edit
              </Link>
            </>
          }
        />

        <div className="mt-6 grid grid-cols-[1fr_1.2fr] gap-6">
          {/* Left: contact details */}
          <Card padding={0}>
            <DetailRow label="Name">{c.name || "—"}</DetailRow>
            <DetailRow label="Phone">{c.phone || "—"}</DetailRow>
            <DetailRow label="Email">{c.email || "—"}</DetailRow>
            <DetailRow label="Address">{c.address || "—"}</DetailRow>
            <DetailRow label="Type">{c.customer_type || "—"}</DetailRow>
            <DetailRow label="Notes" isLast>{c.notes || "—"}</DetailRow>
          </Card>

          {/* Right: linked records */}
          <div className="flex flex-col gap-4">
            {/* Leads */}
            <Card padding={0}>
              <div className="px-4 py-3 border-b border-ud-soft flex items-center justify-between">
                <p className="text-[12px] font-bold uppercase tracking-wide text-ud-faint">Leads</p>
                <span className="text-[12px] text-ud-muted">{leadList.length}</span>
              </div>
              {leadList.length === 0 ? (
                <EmptyState title="No leads yet" />
              ) : (
                leadList.slice(0, 5).map((lead, i) => (
                  <Link key={lead.id} href={`/customers/${id}/edit`}>
                    <ListRow
                      title={lead.service_requested ?? "Lead"}
                      subtitle={lead.status}
                      isLast={i === Math.min(leadList.length, 5) - 1}
                    />
                  </Link>
                ))
              )}
            </Card>

            {/* Jobs */}
            <Card padding={0}>
              <div className="px-4 py-3 border-b border-ud-soft flex items-center justify-between">
                <p className="text-[12px] font-bold uppercase tracking-wide text-ud-faint">Jobs</p>
                <span className="text-[12px] text-ud-muted">{jobList.length}</span>
              </div>
              {jobList.length === 0 ? (
                <EmptyState title="No jobs yet" />
              ) : (
                jobList.slice(0, 5).map((job, i) => (
                  <Link key={job.id} href={`/customers/${id}/edit`}>
                    <ListRow
                      title={job.service_type ?? "Job"}
                      subtitle={job.status}
                      trailing={job.job_value != null ? `$${Number(job.job_value).toLocaleString()}` : undefined}
                      isLast={i === Math.min(jobList.length, 5) - 1}
                    />
                  </Link>
                ))
              )}
            </Card>

            {/* Sales */}
            <Card padding={0}>
              <div className="px-4 py-3 border-b border-ud-soft flex items-center justify-between">
                <p className="text-[12px] font-bold uppercase tracking-wide text-ud-faint">Sales</p>
                <span className="text-[12px] text-ud-muted">{saleList.length}</span>
              </div>
              {saleList.length === 0 ? (
                <EmptyState title="No sales yet" />
              ) : (
                saleList.slice(0, 5).map((sale, i) => (
                  <Link key={sale.id} href={`/customers/${id}/edit`}>
                    <ListRow
                      title={sale.service_type ?? "Sale"}
                      subtitle={sale.payment_status}
                      trailing={sale.amount != null ? `$${Number(sale.amount).toLocaleString()}` : undefined}
                      isLast={i === Math.min(saleList.length, 5) - 1}
                    />
                  </Link>
                ))
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
