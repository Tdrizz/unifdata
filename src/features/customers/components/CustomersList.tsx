import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { formatTimestampDate } from "@/lib/date-format";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { CustomerRow } from "../types";
import { CustomerCreateForm } from "./CustomerCreateForm";

const PAGE_SIZE = 50;

type Props = {
  customers: CustomerRow[];
  count: number;
  profile: IndustryProfile;
  errorParam?: string;
};

function getPrimaryContact(customer: CustomerRow) {
  if (customer.email && customer.phone) {
    return `${customer.email} · ${customer.phone}`;
  }
  if (customer.email) return customer.email;
  if (customer.phone) return customer.phone;
  return "No contact saved";
}

function getContactIssue(customer: { phone: string | null; email: string | null }) {
  const missingPhone = !customer.phone;
  const missingEmail = !customer.email;
  if (missingPhone && missingEmail) return "Missing phone and email";
  if (missingPhone) return "Missing phone";
  if (missingEmail) return "Missing email";
  return "Contact complete";
}

function getContactTone(customer: { phone: string | null; email: string | null }) {
  return customer.phone && customer.email ? "success" : "warning";
}

function getCustomerType(customer: CustomerRow) {
  return customer.customer_type || "No type set";
}

export function CustomersList({ customers, count, profile, errorParam }: Props) {
  const missingEmail = customers.filter((c) => !c.email);
  const missingPhone = customers.filter((c) => !c.phone);
  const missingAddress = customers.filter((c) => !c.address);
  const recordsNeedingCleanup = customers.filter(
    (c) => !c.email || !c.phone || !c.address,
  ).length;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Directory overview
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {count} {profile.labels.customerPlural.toLowerCase()} in your workspace
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {recordsNeedingCleanup > 0
                ? `${recordsNeedingCleanup} record${recordsNeedingCleanup === 1 ? "" : "s"} need contact or address cleanup.`
                : "All current records have complete contact and address details."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="neutral">{count} total</StatusBadge>

            <StatusBadge tone={missingEmail.length > 0 ? "warning" : "success"}>
              {missingEmail.length} missing email
            </StatusBadge>

            <StatusBadge tone={missingPhone.length > 0 ? "warning" : "success"}>
              {missingPhone.length} missing phone
            </StatusBadge>

            <StatusBadge tone={missingAddress.length > 0 ? "warning" : "success"}>
              {missingAddress.length} missing address
            </StatusBadge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-4">
          {[
            {
              label: profile.labels.customerPlural,
              value: count,
              helper: "Saved records",
            },
            {
              label: "Need email",
              value: missingEmail.length,
              helper: "Missing email",
            },
            {
              label: "Need phone",
              value: missingPhone.length,
              helper: "Missing phone",
            },
            {
              label: "Need address",
              value: missingAddress.length,
              helper: "Missing address",
            },
          ].map((item) => (
            <div key={item.label} className="bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                {item.label}
              </p>

              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {item.value}
              </p>

              <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
            </div>
          ))}
        </div>
      </section>

      <CustomerCreateForm profile={profile} />

      <SectionCard
        title="Directory"
        description="Open a record to edit contact details, address, type, or notes."
      >
        <div className="p-4 pb-0">
          <SearchInput placeholder="Search customers…" />
        </div>
        {customers.length === 0 ? (
          <EmptyState
            title={`No ${profile.labels.customerPlural.toLowerCase()} yet`}
            description={`Add a ${profile.labels.customerSingular.toLowerCase()} manually or import from CSV or Google Sheets.`}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}/edit`}
                className="grid gap-4 p-4 transition-colors hover:bg-slate-50 md:grid-cols-[1.25fr_0.8fr_0.7fr] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">
                      {customer.name || `Unnamed ${profile.labels.customerSingular.toLowerCase()}`}
                    </p>

                    <StatusBadge tone={getContactTone(customer) as "success" | "warning"}>
                      {getContactIssue(customer)}
                    </StatusBadge>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {getPrimaryContact(customer)}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {!customer.address && (
                      <StatusBadge tone="neutral">Missing address</StatusBadge>
                    )}
                    {!customer.customer_type && (
                      <StatusBadge tone="neutral">Missing type</StatusBadge>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">Address</p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-700">
                    {customer.address || "No address saved"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">Type</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {getCustomerType(customer)}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Added {formatTimestampDate(customer.created_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
        <Pagination count={count} pageSize={PAGE_SIZE} />
      </SectionCard>
    </div>
  );
}
