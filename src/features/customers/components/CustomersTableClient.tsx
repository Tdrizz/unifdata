"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatTimestampDate } from "@/lib/date-format";
import { bulkDeleteCustomers } from "../actions";
import type { CustomerRow } from "../types";
import type { IndustryProfile } from "@/lib/industry-profiles";

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

type Props = {
  customers: CustomerRow[];
  profile: IndustryProfile;
};

export function CustomersTableClient({ customers, profile }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allSelected = customers.length > 0 && selected.size === customers.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(customers.map((c) => c.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    startTransition(async () => {
      await bulkDeleteCustomers(Array.from(selected));
      setSelected(new Set());
    });
  };

  return (
    <div>
      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div className="mx-4 mb-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="rounded"
            aria-label="Select all customers"
          />
          <span className="text-sm text-slate-600">{selected.size} selected</span>
          <button
            onClick={handleBulkDelete}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? "Deleting..." : `Delete selected (${selected.size})`}
          </button>
        </div>
      )}

      {/* Select-all header row (visible when nothing selected) */}
      {selected.size === 0 && customers.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2">
          <input
            type="checkbox"
            checked={false}
            onChange={toggleAll}
            className="rounded"
            aria-label="Select all customers"
          />
          <span className="text-xs font-medium text-slate-500">Select all</span>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {customers.map((customer) => (
          <div key={customer.id} className="relative flex items-start hover:bg-slate-50 transition-colors">
            {/* Checkbox — sits outside the Link so clicks don't navigate */}
            <div className="flex shrink-0 items-center px-4 py-5">
              <input
                type="checkbox"
                checked={selected.has(customer.id)}
                onChange={() => toggleOne(customer.id)}
                className="rounded"
                aria-label={`Select ${customer.name || "customer"}`}
              />
            </div>

            {/* Row content — full clickable link */}
            <Link
              href={`/customers/${customer.id}/edit`}
              className="grid flex-1 gap-4 py-4 pr-4 md:grid-cols-[1.25fr_0.8fr_0.7fr] md:items-center"
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
          </div>
        ))}
      </div>
    </div>
  );
}
