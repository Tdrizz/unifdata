"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
import { SaleCreateForm } from "./SaleCreateForm";
import type { SaleRow } from "../types";
import type { ContactForSelect } from "@/lib/crm/types";
import type { IndustryProfile } from "@/lib/industry-profiles";

type Props = {
  sales: SaleRow[];
  profile: IndustryProfile;
  contacts?: ContactForSelect[];
};

type Filter = "all" | "overdue" | "pending" | "paid";

function isPaid(status: string | null) {
  return (status || "").toLowerCase() === "paid";
}
function isOverdue(status: string | null) {
  return (status || "").toLowerCase().includes("overdue");
}
function isPending(status: string | null) {
  return !isPaid(status) && !isOverdue(status);
}

function statusBadgeColor(status: string | null): string {
  if (isPaid(status)) return "text-ud-success bg-ud-success-bg";
  if (isOverdue(status)) return "text-ud-danger bg-ud-danger-bg";
  return "text-ud-warning bg-ud-warning-bg";
}

function formatSaleDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function sourceBadge(sourceSystem: string | null | undefined) {
  if (!sourceSystem) return null;
  const labels: Record<string, string> = {
    quickbooks: "QB",
    stripe: "Stripe",
    square: "Square",
    jobber: "Jobber",
  };
  return labels[sourceSystem.toLowerCase()] ?? sourceSystem.toUpperCase().slice(0, 4);
}

export function MobileSalesView({ sales, profile, contacts = [] }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const saleSingular = profile.labels.saleSingular ?? "Invoice";
  const salePlural = profile.labels.salePlural ?? "Invoices";

  const contactById = new Map(contacts.map((c) => [c.id, c]));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const revenueMTD = sales
    .filter((s) => new Date(s.sale_date || s.created_at) >= startOfMonth)
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const outstanding = sales.filter((s) => !isPaid(s.payment_status));
  const outstandingValue = outstanding.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const overdueCount = sales.filter((s) => isOverdue(s.payment_status)).length;
  const paidCount = sales.filter((s) => isPaid(s.payment_status)).length;

  const filtered = sales.filter((s) => {
    if (filter === "paid") return isPaid(s.payment_status);
    if (filter === "overdue") return isOverdue(s.payment_status);
    if (filter === "pending") return isPending(s.payment_status);
    return true;
  });

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: sales.length },
    { key: "overdue", label: "Overdue", count: overdueCount },
    { key: "pending", label: "Pending", count: sales.filter((s) => isPending(s.payment_status)).length },
    { key: "paid", label: "Paid", count: paidCount },
  ];

  return (
    <div className="block md:hidden pb-8">
      {/* Header */}
      <div className="px-4 pt-[22px] pb-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.13em] text-ud-muted mb-1">
          {salePlural}
        </p>
        <p className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-ud-ink">
          {formatCurrency(revenueMTD)}
          <span className="text-[16px] font-normal text-ud-muted ml-2">this month</span>
        </p>
      </div>

      {/* Stat cards */}
      <div className="px-4 grid grid-cols-2 gap-3 pb-5">
        <div className="bg-ud-surface border border-ud rounded-[12px] p-4">
          <p className="text-[12px] font-medium text-ud-muted">Outstanding</p>
          <p className={cn(
            "text-[22px] font-semibold tracking-[-0.02em] mt-0.5 [font-variant-numeric:tabular-nums]",
            outstandingValue > 0 ? "text-ud-danger" : "text-ud-ink",
          )}>
            {formatCurrency(outstandingValue)}
          </p>
          <p className="text-[12px] text-ud-faint mt-0.5">{outstanding.length} open</p>
        </div>
        <div className="bg-ud-surface border border-ud rounded-[12px] p-4">
          <p className="text-[12px] font-medium text-ud-muted">Overdue</p>
          <p className={cn(
            "text-[22px] font-semibold tracking-[-0.02em] mt-0.5",
            overdueCount > 0 ? "text-ud-danger" : "text-ud-ink",
          )}>
            {overdueCount}
          </p>
          <p className="text-[12px] text-ud-faint mt-0.5">{paidCount} paid</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="overflow-x-auto no-scrollbar flex gap-2 px-4 pb-[14px]">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "flex-shrink-0 rounded-full px-[16px] py-[9px] text-[13px] font-semibold transition-colors",
              filter === f.key
                ? "bg-ud-ink text-white"
                : "bg-ud-surface border border-ud text-ud-muted",
            )}
          >
            {f.label} {f.count}
          </button>
        ))}
      </div>

      {/* Sale cards */}
      <div className="px-4 flex flex-col gap-3 pb-5">
        {filtered.length === 0 ? (
          <p className="text-center text-[13px] text-ud-faint py-8">No {salePlural.toLowerCase()} here.</p>
        ) : (
          filtered.map((sale) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const saleContactId = (sale as any).contact_id ?? sale.customer_id;
            const customer = saleContactId ? contactById.get(saleContactId) : null;
            return (
              <Link
                key={sale.id}
                href={`/sales/${sale.id}/edit`}
                className="bg-ud-surface rounded-[10px] border border-ud p-4 block active:bg-ud-surface-sunk"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] text-ud-ink truncate">
                      {sale.service_type || saleSingular}
                    </p>
                    {customer && (
                      <p className="text-[12px] text-ud-muted mt-[2px]">{customer.name}</p>
                    )}
                  </div>
                  <p className="text-[16px] font-semibold text-ud-ink [font-variant-numeric:tabular-nums] shrink-0">
                    {formatCurrency(sale.amount)}
                  </p>
                </div>
                <div className="mt-[10px] flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold",
                    statusBadgeColor(sale.payment_status),
                  )}>
                    {sale.payment_status || "Unpaid"}
                  </span>
                  {sourceBadge(sale.source_system) && (
                    <span className="inline-flex items-center px-[7px] py-[2px] rounded-[5px] text-[10px] font-bold bg-[rgba(74,63,168,0.08)] text-ud-accent border border-[rgba(74,63,168,0.15)]">
                      {sourceBadge(sale.source_system)}
                    </span>
                  )}
                  {formatSaleDate(sale.sale_date) && (
                    <span className="text-[12px] text-ud-muted">{formatSaleDate(sale.sale_date)}</span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Quick add */}
      <div id="sale-quick-add" className="px-4 mt-2">
        <SaleCreateForm profile={profile} contacts={contacts} />
      </div>
    </div>
  );
}
