"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { useProfile } from "@/lib/profile-context";
import type { SaleRow } from "../types";
import type { ContactForSelect } from "@/lib/crm/types";
import { SaleCreateForm } from "./SaleCreateForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterChip } from "@/components/ui/FilterChip";

type Props = {
  sales: SaleRow[];
  count: number;
  page: number;
  q?: string;
  profile: IndustryProfile;
  selectedStatus: string;
  selectedSource: string;
  contacts?: ContactForSelect[];
};

type FilterType = "all" | "overdue" | "pending" | "paid";

function isPaid(status: string | null) {
  return (status || "").toLowerCase() === "paid";
}

function isOverdue(status: string | null) {
  return (status || "").toLowerCase().includes("overdue");
}

function isPending(status: string | null) {
  const s = (status || "").toLowerCase();
  return s === "pending" || s === "unpaid" || s === "partial" || (s !== "paid" && !s.includes("overdue"));
}

function statusBadgeClass(status: string | null) {
  const s = (status || "").toLowerCase();
  if (isPaid(status)) return "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-success-bg text-ud-success";
  if (s.includes("overdue")) return "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-danger-bg text-ud-danger";
  if (s === "pending" || s === "unpaid") return "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-warning-bg text-ud-warning";
  return "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-surface-sunk text-ud-muted";
}

function formatSaleDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

function formatRelativeTime(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getLastNMonths(n: number, now: Date) {
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString("en-US", { month: "short" }) });
  }
  return months;
}

function sumSalesForMonth(sales: SaleRow[], year: number, month: number) {
  return sales
    .filter((s) => {
      const d = new Date(s.sale_date || s.created_at);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
}

const btnPrimary = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-3 py-2 rounded-[9px] bg-ud-accent text-white hover:opacity-90 transition-opacity duration-[120ms]";

export function SalesList({ sales, count: _count, page: _page, q: _q, contacts = [], selectedStatus, selectedSource, profile }: Props) {
  const p = useProfile();
  const [filter, setFilter] = useState<FilterType>(
    selectedStatus === "paid" ? "paid" : selectedStatus === "overdue" ? "overdue" : "all"
  );
  const saleSingular = profile?.labels.saleSingular ?? p.labels.saleSingular;
  const salePlural = profile?.labels.salePlural ?? p.labels.salePlural;
  const customerSingular = profile?.labels.customerSingular ?? p.labels.customerSingular;

  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const revenueMTD = sales
    .filter((s) => new Date(s.sale_date || s.created_at) >= startOfMonth)
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const outstanding = sales.filter((s) => !isPaid(s.payment_status));
  const outstandingValue = outstanding.reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const paidThisMonth = sales.filter((s) => {
    const d = new Date(s.sale_date || s.created_at);
    return d >= startOfMonth && isPaid(s.payment_status);
  });
  const paidThisMonthValue = paidThisMonth.reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const avgOpenInvoice = outstanding.length > 0 ? outstandingValue / outstanding.length : 0;

  const overdueCount = sales.filter((s) => isOverdue(s.payment_status)).length;
  const pendingCount = sales.filter((s) => isPending(s.payment_status) && !isPaid(s.payment_status) && !isOverdue(s.payment_status)).length;
  const paidCount = sales.filter((s) => isPaid(s.payment_status)).length;
  const openCount = outstanding.length;

  const filtered = sales.filter((s) => {
    if (selectedSource && (s.source ?? "").toLowerCase() !== selectedSource.toLowerCase()) return false;
    if (filter === "paid") return isPaid(s.payment_status);
    if (filter === "overdue") return isOverdue(s.payment_status);
    if (filter === "pending") return isPending(s.payment_status) && !isPaid(s.payment_status) && !isOverdue(s.payment_status);
    return true;
  });

  const months = getLastNMonths(6, now);
  const maxVal = Math.max(...months.map((m) => sumSalesForMonth(sales, m.year, m.month)), 1);
  const sixMonthTotal = months.reduce((sum, m) => sum + sumSalesForMonth(sales, m.year, m.month), 0);

  return (
    <div className="hidden md:block px-7 pb-10 pt-7">
      <PageHeader
        eyebrow="Revenue"
        title={`Revenue & ${salePlural.toLowerCase()}`}
        description={`${formatCurrency(revenueMTD)} this month · ${openCount} open ${openCount === 1 ? saleSingular.toLowerCase() : salePlural.toLowerCase()}`}
        className="mb-6"
        actions={
          <a href="#sale-quick-add" className={btnPrimary}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New {saleSingular.toLowerCase()}
          </a>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-3 mb-[22px]">
        <div className={`bg-ud-surface border rounded-[16px] p-5 shadow-ud ${revenueMTD > 0 ? "bg-[#f4fdf6] border-[rgba(29,107,46,0.12)]" : "border-[rgba(0,0,0,0.06)]"}`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-ud-faint">Month to date</div>
          <div className={`text-[30px] font-bold tracking-[-0.03em] mt-1.5 leading-none [font-variant-numeric:tabular-nums] ${revenueMTD > 0 ? "text-ud-success" : "text-ud-ink"}`}>{formatCurrency(revenueMTD)}</div>
          <div className="text-[12px] text-ud-muted mt-1.5">This month</div>
        </div>
        <div className={`bg-ud-surface border rounded-[16px] p-5 shadow-ud ${outstandingValue > 0 ? "bg-[#fef8f8] border-[rgba(160,40,40,0.12)]" : "border-[rgba(0,0,0,0.06)]"}`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-ud-faint">Outstanding</div>
          <div className={`text-[30px] font-bold tracking-[-0.03em] mt-1.5 leading-none [font-variant-numeric:tabular-nums] ${outstandingValue > 0 ? "text-ud-danger" : "text-ud-ink"}`}>{formatCurrency(outstandingValue)}</div>
          <div className="text-[12px] text-ud-muted mt-1.5">{overdueCount} overdue · {pendingCount} pending</div>
        </div>
        <div className="bg-ud-surface border border-[rgba(0,0,0,0.06)] rounded-[16px] p-5 shadow-ud">
          <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-ud-faint">Paid this month</div>
          <div className="text-[30px] font-bold tracking-[-0.03em] text-ud-ink mt-1.5 leading-none [font-variant-numeric:tabular-nums]">{formatCurrency(paidThisMonthValue)}</div>
          <div className="text-[12px] text-ud-muted mt-1.5">{paidCount} {salePlural.toLowerCase()} collected</div>
        </div>
        <div className="bg-ud-surface border border-[rgba(0,0,0,0.06)] rounded-[16px] p-5 shadow-ud">
          <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-ud-faint">Avg open {saleSingular.toLowerCase()}</div>
          <div className="text-[30px] font-bold tracking-[-0.03em] text-ud-ink mt-1.5 leading-none [font-variant-numeric:tabular-nums]">{formatCurrency(avgOpenInvoice)}</div>
          <div className="text-[12px] text-ud-muted mt-1.5">{outstanding.length} outstanding</div>
        </div>
      </div>

      {/* Revenue trend chart */}
      <div className="bg-ud-surface border border-[rgba(0,0,0,0.06)] rounded-[var(--radius-ud-lg)] shadow-ud overflow-hidden mb-[22px]">
        <div className="px-[22px] py-4 border-b border-[rgba(0,0,0,0.05)] flex items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-semibold text-ud-ink">Revenue trend</p>
            <p className="text-[12px] text-ud-muted mt-0.5">Last 6 months · MTD figures for {now.toLocaleDateString("en-US", { month: "long" })}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted)" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--accent)" }} />
              This year
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted)" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--surface-sunk)", border: "1px solid var(--border)" }} />
              Last year
            </div>
          </div>
        </div>
        <div className="p-[20px_24px_18px]">
          {/* Chart area */}
          <div style={{ position: "relative", height: "120px", display: "flex", alignItems: "flex-end", gap: "10px", marginBottom: "6px" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
              <div style={{ fontSize: "10px", color: "var(--faint)", fontWeight: 600 }}>{formatCurrency(maxVal)}</div>
              <div style={{ fontSize: "10px", color: "var(--faint)", fontWeight: 600 }}>{formatCurrency(maxVal / 2)}</div>
              <div style={{ fontSize: "10px", color: "var(--faint)", fontWeight: 600 }}>$0</div>
            </div>
            <div style={{ position: "absolute", left: "28px", right: 0, top: 0, bottom: 0, pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, borderTop: "1px dashed rgba(0,0,0,0.07)" }} />
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, borderTop: "1px dashed rgba(0,0,0,0.07)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1px solid rgba(0,0,0,0.09)" }} />
            </div>
            <div style={{ flex: 1, marginLeft: "28px", display: "flex", gap: "10px", alignItems: "flex-end", height: "100%" }}>
              {months.map((m, i) => {
                const val = sumSalesForMonth(sales, m.year, m.month);
                const pct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
                const lastYearVal = sumSalesForMonth(sales, m.year - 1, m.month);
                const lastPct = maxVal > 0 ? Math.round((lastYearVal / maxVal) * 100) : 0;
                const isCurrentMonth = m.year === now.getFullYear() && m.month === now.getMonth();
                return (
                  <div key={i} style={{ flex: 1, display: "flex", gap: "3px", alignItems: "flex-end", height: "100%", position: "relative" }}>
                    <div style={{ flex: 1, background: "var(--surface-sunk)", border: "1px solid var(--border)", borderRadius: "4px 4px 0 0", height: `${Math.max(lastPct, 2)}%` }} title={`${m.label} ${m.year - 1} · ${formatCurrency(lastYearVal)}`} />
                    <div style={{ flex: 1, background: "var(--accent)", borderRadius: "4px 4px 0 0", height: `${Math.max(pct, 2)}%`, opacity: isCurrentMonth ? 1 : 0.8, position: "relative" }} title={`${m.label} ${m.year}${isCurrentMonth ? " MTD" : ""} · ${formatCurrency(val)}`}>
                      {isCurrentMonth && val > 0 && (
                        <div style={{ position: "absolute", top: "-20px", left: "50%", transform: "translateX(-50%)", fontSize: "10px", fontWeight: 700, color: "var(--accent)", whiteSpace: "nowrap" }}>
                          {val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : formatCurrency(val)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* X-axis */}
          <div style={{ display: "flex", gap: "10px", marginLeft: "28px" }}>
            {months.map((m, i) => {
              const isCurrentMonth = m.year === now.getFullYear() && m.month === now.getMonth();
              return (
                <div key={i} style={{ flex: 1, textAlign: "center", fontSize: "10.5px", fontWeight: isCurrentMonth ? 700 : 600, color: isCurrentMonth ? "var(--accent)" : "var(--faint)" }}>
                  {m.label}{isCurrentMonth ? " ✦" : ""}
                </div>
              );
            })}
          </div>
          {/* Summary row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1px", marginTop: "18px", background: "var(--border)", borderRadius: "10px", overflow: "hidden", border: "1px solid var(--border)" }}>
            <div style={{ background: "var(--surface)", padding: "11px 14px" }}>
              <div style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--faint)", marginBottom: "3px" }}>6-month total</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>{formatCurrency(sixMonthTotal)}</div>
            </div>
            <div style={{ background: "var(--surface)", padding: "11px 14px" }}>
              <div style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--faint)", marginBottom: "3px" }}>vs same period last yr</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--success)", letterSpacing: "-0.02em" }}>—</div>
            </div>
            <div style={{ background: "var(--surface)", padding: "11px 14px" }}>
              <div style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--faint)", marginBottom: "3px" }}>Best month</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>
                {months.reduce((best, m) => {
                  const v = sumSalesForMonth(sales, m.year, m.month);
                  return v > best.v ? { label: m.label, v } : best;
                }, { label: "—", v: 0 }).label}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0.5 bg-ud-surface-sunk rounded-[9px] p-[3px] border border-ud w-fit mb-4">
        <FilterChip active={filter === "all"} count={sales.length} onClick={() => setFilter("all")}>All</FilterChip>
        <FilterChip active={filter === "overdue"} count={overdueCount} onClick={() => setFilter("overdue")}>Overdue</FilterChip>
        <FilterChip active={filter === "pending"} count={pendingCount} onClick={() => setFilter("pending")}>Pending</FilterChip>
        <FilterChip active={filter === "paid"} count={paidCount} onClick={() => setFilter("paid")}>Paid</FilterChip>
      </div>

      {/* Invoice table */}
      <div className="overflow-hidden rounded-[var(--radius-ud-lg)] border border-[rgba(0,0,0,0.06)] shadow-ud">
        <table className="w-full border-collapse bg-ud-surface">
          <thead>
            <tr>
              {[saleSingular, customerSingular, "Amount", "Issued", "Due", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-[10px] text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint bg-[rgba(0,0,0,0.015)] border-b border-ud whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child_td]:border-b-0 [&_tr:hover_td]:bg-[rgba(0,0,0,0.012)]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <p className="text-[14px] font-semibold text-ud-ink mb-1">No {salePlural.toLowerCase()} yet</p>
                  <p className="text-[13px] text-ud-muted mb-4 max-w-xs mx-auto">Log your first {saleSingular.toLowerCase()} to start tracking revenue, payment status, and trends.</p>
                  <div className="flex items-center justify-center gap-3">
                    <a href="#sale-quick-add" className="inline-flex items-center gap-1.5 font-semibold text-[13px] px-3 py-2 rounded-[9px] bg-ud-accent text-white hover:opacity-90 transition-opacity">+ New {saleSingular.toLowerCase()}</a>
                    <Link href="/imports" className="text-[13px] text-ud-muted hover:text-ud-ink transition-colors">or import via CSV →</Link>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((sale) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const saleContactId = (sale as any).contact_id ?? sale.customer_id;
                const customer = saleContactId ? contactById.get(saleContactId) : null;
                const isOver = isOverdue(sale.payment_status);
                return (
                  <tr key={sale.id}>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] font-semibold text-ud-ink">#{sale.id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-text">{customer?.name || sale.service_type || "—"}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] font-semibold [font-variant-numeric:tabular-nums]">{formatCurrency(sale.amount)}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted">{formatSaleDate(sale.sale_date || sale.created_at)}</td>
                    <td className={`px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] ${isOver ? "font-semibold text-ud-danger" : "text-ud-muted"}`}>—</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]"><span className={statusBadgeClass(sale.payment_status)}>{sale.payment_status || "Pending"}</span></td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]">
                      <div className="flex items-center gap-2 justify-end">
                        {sourceBadge(sale.source_system) && (
                          <span
                            title={`Synced from ${sale.source_system}${sale.last_synced_at ? ` · ${formatRelativeTime(sale.last_synced_at)}` : ""}`}
                            className="inline-flex items-center px-[7px] py-[2px] rounded-[5px] text-[10px] font-bold bg-[rgba(74,63,168,0.08)] text-ud-accent border border-[rgba(74,63,168,0.15)]"
                          >
                            {sourceBadge(sale.source_system)}
                          </span>
                        )}
                        <Link href={`/sales/${sale.id}/edit`} className="text-ud-accent no-underline font-medium text-[12px] hover:underline">View →</Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Quick add */}
      <div id="sale-quick-add" style={{ marginTop: "20px" }}>
        <SaleCreateForm profile={profile} contacts={contacts} />
      </div>
    </div>
  );
}
