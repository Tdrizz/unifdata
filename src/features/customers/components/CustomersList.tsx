import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DismissError } from "@/components/ui/DismissError";
import { formatTimestampDate } from "@/lib/date-format";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { CustomerRow } from "../types";
import { createCustomerAction } from "../actions";

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

      <details className="group rounded-3xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Add {profile.labels.customerSingular.toLowerCase()} or business
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Add a record manually without leaving the {profile.labels.customerPlural} page.
            </p>
          </div>

          <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 group-open:hidden">
            Open
          </span>

          <span className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 group-open:inline-flex">
            Close
          </span>
        </summary>

        <form
          action={createCustomerAction}
          className="space-y-4 border-t border-slate-100 p-5"
        >
          {errorParam && <DismissError message={errorParam} />}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Name
              <input
                name="name"
                required
                placeholder="John Smith, ABC Flooring, Ocean View Home..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Type
              <input
                name="customer_type"
                placeholder="Customer, lead, residential, commercial..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Phone
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="808-555-1234"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Email
              <input
                name="email"
                type="email"
                placeholder="customer@example.com"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Address
            <input
              name="address"
              placeholder="Service address, city, or area"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Notes
            <textarea
              name="notes"
              rows={3}
              placeholder="Preferences, project details, or follow-up context..."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Add {profile.labels.customerSingular.toLowerCase()}
            </button>
          </div>
        </form>
      </details>

      <SectionCard
        title="Directory"
        description="Open a record to edit contact details, address, type, or notes."
      >
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
      </SectionCard>
    </div>
  );
}
