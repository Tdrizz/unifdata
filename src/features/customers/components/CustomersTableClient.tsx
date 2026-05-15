"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatTimestampDate } from "@/lib/date-format";
import { bulkDeleteCustomers } from "../actions";
import type { CustomerRow } from "../types";
import type { IndustryProfile } from "@/lib/industry-profiles";

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
        <div className="mx-4 mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
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

      {/* Table wrapper */}
      <div className="overflow-x-auto">
        {/* Table header */}
        <div
          className="grid border-b border-slate-100 bg-slate-50 px-5 py-3"
          style={{ gridTemplateColumns: "40px 2.2fr 1.3fr 1.2fr 0.9fr 0.9fr 0.6fr" }}
        >
          <div /> {/* checkbox column */}
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-500">Client</p>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-500">Contact</p>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-500">City</p>
          <p className="text-right text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-500">Type</p>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-500">Added</p>
          <div /> {/* action column */}
        </div>

        {/* Table body */}
        <div className="divide-y divide-slate-100">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="relative grid items-center px-5 py-3.5 hover:bg-slate-50 transition-colors"
              style={{ gridTemplateColumns: "40px 2.2fr 1.3fr 1.2fr 0.9fr 0.9fr 0.6fr" }}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selected.has(customer.id)}
                onChange={() => toggleOne(customer.id)}
                className="rounded"
                aria-label={`Select ${customer.name || "customer"}`}
              />

              {/* Client cell — name + avatar + badges */}
              <Link href={`/customers/${customer.id}/edit`} className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[33%] bg-[#1D2D3E] text-[13px] font-bold text-white">
                  {(customer.name || "?")[0].toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-slate-950 truncate">
                    {customer.name || `Unnamed ${profile.labels.customerSingular.toLowerCase()}`}
                  </p>
                  {(!customer.email || !customer.phone) && (
                    <StatusBadge tone="warning">
                      {!customer.email && !customer.phone
                        ? "Missing email & phone"
                        : !customer.email
                          ? "Missing email"
                          : "Missing phone"}
                    </StatusBadge>
                  )}
                </div>
              </Link>

              {/* Contact cell */}
              <Link href={`/customers/${customer.id}/edit`} className="min-w-0">
                <p className="text-[12.5px] text-slate-700 truncate">{customer.email || "—"}</p>
                <p className="text-[11px] font-mono text-slate-400">{customer.phone || "—"}</p>
              </Link>

              {/* City cell — extract from address */}
              <Link href={`/customers/${customer.id}/edit`}>
                <p className="text-[12.5px] text-slate-700">
                  {customer.address
                    ? customer.address.split(",").slice(-2, -1)[0]?.trim() || "—"
                    : "—"}
                </p>
              </Link>

              {/* Type cell */}
              <Link href={`/customers/${customer.id}/edit`} className="text-right">
                <p className="text-[12.5px] text-slate-700">{customer.customer_type || "—"}</p>
              </Link>

              {/* Added date cell */}
              <Link href={`/customers/${customer.id}/edit`}>
                <p className="text-[12px] text-slate-400">{formatTimestampDate(customer.created_at)}</p>
              </Link>

              {/* Open/action cell */}
              <div className="flex justify-end">
                <Link
                  href={`/customers/${customer.id}/edit`}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
