import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { CustomerRow } from "../types";
import { CustomerCreateForm } from "./CustomerCreateForm";
import { CustomersTableClient } from "./CustomersTableClient";

const PAGE_SIZE = 50;

type Props = {
  customers: CustomerRow[];
  count: number;
  profile: IndustryProfile;
  errorParam?: string;
};

export function CustomersList({ customers, count, profile, errorParam }: Props) {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Clients"
        title={`${count} ${profile.labels.customerPlural.toLowerCase()} in your workspace`}
        description="Manage client records and quickly see which contact fields are missing."
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/export/csv?table=customers"
              download
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Export CSV
            </a>
            <a
              href="/customers/duplicates"
              className="rounded-2xl bg-[#1D2D3E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a3f57]"
            >
              Find duplicates
            </a>
          </div>
        }
      />

      <CustomerCreateForm profile={profile} />

      <SectionCard
        title="Directory"
        description="Open a record to edit contact details, address, type, or notes."
      >
        <div className="px-4 pt-4">
          <SearchInput placeholder={`Search ${profile.labels.customerPlural.toLowerCase()}…`} />
        </div>
        {customers.length === 0 ? (
          <EmptyState
            title={`No ${profile.labels.customerPlural.toLowerCase()} yet`}
            description={`Add a ${profile.labels.customerSingular.toLowerCase()} manually or import from CSV or Google Sheets.`}
          />
        ) : (
          <CustomersTableClient customers={customers} profile={profile} />
        )}
        <Pagination count={count} pageSize={PAGE_SIZE} />
      </SectionCard>
    </div>
  );
}
