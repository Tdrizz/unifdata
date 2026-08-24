"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
import { SaleCreateForm } from "./SaleCreateForm";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Pagination } from "@/components/ui/Pagination";
import type { SaleRow, JobRow } from "../types";
import type { ContactForSelect } from "@/lib/crm/types";
import type { IndustryProfile } from "@/lib/industry-profiles";
import {
  isPaid,
  isOverdue,
  formatSaleDate,
  sourceBadge,
  getLastNMonths,
  sumSalesForMonth,
  computeSalesStats,
  getSaleContactId,
} from "../compute";

type Props = {
  sales: SaleRow[];
  count: number;
  profile: IndustryProfile;
  selectedStatus: string;
  selectedSource: string;
  contacts?: ContactForSelect[];
  jobs?: Pick<JobRow, "id" | "service_type">[];
};

type Filter = "all" | "overdue" | "pending" | "paid";

function statusBadgeColor(status: string | null): string {
  if (isPaid(status)) return "text-ud-success bg-ud-success-bg";
  if (isOverdue(status)) return "text-ud-danger bg-ud-danger-bg";
  return "text-ud-warning bg-ud-warning-bg";
}

export function MobileSalesView({ sales, count, profile, selectedStatus, selectedSource, contacts = [], jobs = [] }: Props) {
  const [filter, setFilter] = useState<Filter>(
    selectedStatus === "paid" ? "paid" : selectedStatus === "overdue" ? "overdue" : selectedStatus === "pending" ? "pending" : "all",
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const saleSingular = profile.labels.saleSingular ?? "Invoice";
  const salePlural = profile.labels.salePlural ?? "Invoices";

  const contactById = new Map(contacts.map((c) => [c.id, c]));

  const {
    now,
    revenueMTD,
    outstanding,
    outstandingValue,
    paidThisMonthValue,
    avgOpenInvoice,
    overdueCount,
    pendingCount,
    paidCount,
  } = computeSalesStats(sales);

  const filtered = sales.filter((s) => {
    if (selectedSource && (s.source ?? "").toLowerCase() !== selectedSource.toLowerCase()) return false;
    if (filter === "paid") return isPaid(s.payment_status);
    if (filter === "overdue") return isOverdue(s.payment_status);
    if (filter === "pending") return !isPaid(s.payment_status) && !isOverdue(s.payment_status);
    return true;
  });

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: sales.length },
    { key: "overdue", label: "Overdue", count: overdueCount },
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "paid", label: "Paid", count: paidCount },
  ];

  const months = getLastNMonths(6, now);
  const maxVal = Math.max(...months.map((m) => sumSalesForMonth(sales, m.year, m.month)), 1);
  const sixMonthTotal = months.reduce((sum, m) => sum + sumSalesForMonth(sales, m.year, m.month), 0);

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

      {/* Stat cards — same 4 desktop shows, arranged 2x2 for a phone */}
      <div className="px-4 grid grid-cols-2 gap-3 pb-5">
        <div className="bg-ud-surface border border-ud rounded-[12px] p-4">
          <p className="text-[12px] font-medium text-ud-muted">Outstanding</p>
          <p className={cn(
            "text-[22px] font-semibold tracking-[-0.02em] mt-0.5 [font-variant-numeric:tabular-nums]",
            outstandingValue > 0 ? "text-ud-danger" : "text-ud-ink",
          )}>
            {formatCurrency(outstandingValue)}
          </p>
          <p className="text-[12px] text-ud-faint mt-0.5">{overdueCount} overdue · {pendingCount} pending</p>
        </div>
        <div className="bg-ud-surface border border-ud rounded-[12px] p-4">
          <p className="text-[12px] font-medium text-ud-muted">Paid this month</p>
          <p className="text-[22px] font-semibold tracking-[-0.02em] mt-0.5 [font-variant-numeric:tabular-nums] text-ud-ink">
            {formatCurrency(paidThisMonthValue)}
          </p>
          <p className="text-[12px] text-ud-faint mt-0.5">{paidCount} {salePlural.toLowerCase()} collected</p>
        </div>
        <div className="bg-ud-surface border border-ud rounded-[12px] p-4">
          <p className="text-[12px] font-medium text-ud-muted">Avg open {saleSingular.toLowerCase()}</p>
          <p className="text-[22px] font-semibold tracking-[-0.02em] mt-0.5 [font-variant-numeric:tabular-nums] text-ud-ink">
            {formatCurrency(avgOpenInvoice)}
          </p>
          <p className="text-[12px] text-ud-faint mt-0.5">{outstanding.length} outstanding</p>
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

      {/* Revenue trend — same 6-month chart desktop shows */}
      <div className="mx-4 mb-5 bg-ud-surface border border-ud rounded-[14px] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-ud-soft">
          <p className="text-[13.5px] font-semibold text-ud-ink">Revenue trend</p>
          <p className="text-[12px] text-ud-muted mt-0.5">Last 6 months · MTD for {now.toLocaleDateString("en-US", { month: "long" })}</p>
        </div>
        <div className="p-4">
          <div style={{ position: "relative", height: "100px", display: "flex", alignItems: "flex-end", gap: "6px", marginBottom: "6px" }}>
            <div style={{ flex: 1, display: "flex", gap: "6px", alignItems: "flex-end", height: "100%" }}>
              {months.map((m, i) => {
                const val = sumSalesForMonth(sales, m.year, m.month);
                const pct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
                const lastYearVal = sumSalesForMonth(sales, m.year - 1, m.month);
                const lastPct = maxVal > 0 ? Math.round((lastYearVal / maxVal) * 100) : 0;
                const isCurrentMonth = m.year === now.getFullYear() && m.month === now.getMonth();
                return (
                  <div key={i} style={{ flex: 1, display: "flex", gap: "2px", alignItems: "flex-end", height: "100%" }}>
                    <div style={{ flex: 1, background: "var(--surface-sunk)", border: "1px solid var(--border)", borderRadius: "3px 3px 0 0", height: `${Math.max(lastPct, 2)}%` }} />
                    <div style={{ flex: 1, background: "var(--accent)", borderRadius: "3px 3px 0 0", height: `${Math.max(pct, 2)}%`, opacity: isCurrentMonth ? 1 : 0.8 }} />
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {months.map((m, i) => {
              const isCurrentMonth = m.year === now.getFullYear() && m.month === now.getMonth();
              return (
                <div key={i} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: isCurrentMonth ? 700 : 600, color: isCurrentMonth ? "var(--accent)" : "var(--faint)" }}>
                  {m.label}
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[8px] bg-ud-surface-soft px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-ud-faint">6-month total</p>
              <p className="text-[14px] font-bold text-ud-ink mt-0.5">{formatCurrency(sixMonthTotal)}</p>
            </div>
            <div className="rounded-[8px] bg-ud-surface-soft px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-ud-faint">Best month</p>
              <p className="text-[14px] font-bold text-ud-ink mt-0.5">
                {months.reduce((best, m) => {
                  const v = sumSalesForMonth(sales, m.year, m.month);
                  return v > best.v ? { label: m.label, v } : best;
                }, { label: "—", v: 0 }).label}
              </p>
            </div>
          </div>
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
          <div className="text-center py-8">
            <p className="text-[13px] text-ud-faint">No {salePlural.toLowerCase()} here.</p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="text-[13px] font-semibold text-ud-accent"
              >
                + New {saleSingular.toLowerCase()}
              </button>
              <Link href="/imports" className="text-[13px] text-ud-muted">or import via CSV →</Link>
            </div>
          </div>
        ) : (
          filtered.map((sale) => {
            const saleContactId = getSaleContactId(sale);
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
                  {formatSaleDate(sale.sale_date || sale.created_at) && (
                    <span className="text-[12px] text-ud-muted">{formatSaleDate(sale.sale_date || sale.created_at)}</span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className="px-4 pb-5">
        <Pagination count={count} pageSize={50} />
      </div>

      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-[calc(var(--mobile-tabbar-h)+env(safe-area-inset-bottom)+12px)] right-4 z-30 w-12 h-12 rounded-full bg-ud-accent text-white shadow-ud-pop flex items-center justify-center active:scale-95 transition-transform md:hidden"
        aria-label={"Add " + (profile.labels.saleSingular ?? "invoice")}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={"Add " + (profile.labels.saleSingular ?? "invoice")}>
        <SaleCreateForm profile={profile} jobs={jobs} />
      </BottomSheet>
    </div>
  );
}
