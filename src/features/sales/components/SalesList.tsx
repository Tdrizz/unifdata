"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { SaleRow, CustomerRow } from "../types";

type Props = {
  sales: SaleRow[];
  count: number;
  page: number;
  q?: string;
  profile: IndustryProfile;
  selectedStatus: string;
  selectedSource: string;
  customers?: Pick<CustomerRow, "id" | "name">[];
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
  if (isPaid(status)) return "badge badge-success";
  if (s.includes("overdue")) return "badge badge-danger";
  if (s === "pending" || s === "unpaid") return "badge badge-warning";
  return "badge badge-neutral";
}

function formatSaleDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

export function SalesList({ sales, count, customers = [], selectedStatus }: Props) {
  const [filter, setFilter] = useState<FilterType>(
    selectedStatus === "paid" ? "paid" : selectedStatus === "overdue" ? "overdue" : "all"
  );

  const customerById = new Map(customers.map((c) => [c.id, c]));
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
    if (filter === "paid") return isPaid(s.payment_status);
    if (filter === "overdue") return isOverdue(s.payment_status);
    if (filter === "pending") return isPending(s.payment_status) && !isPaid(s.payment_status) && !isOverdue(s.payment_status);
    return true;
  });

  // Chart data — last 6 months
  const months = getLastNMonths(6, now);
  const maxVal = Math.max(...months.map((m) => sumSalesForMonth(sales, m.year, m.month)), 1);

  const sixMonthTotal = months.reduce((sum, m) => sum + sumSalesForMonth(sales, m.year, m.month), 0);

  return (
    <div className="hidden md:block" style={{ padding: "28px 28px 40px" }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Revenue</div>
          <div className="page-title">Revenue &amp; invoices</div>
          <div className="page-desc">
            {formatCurrency(revenueMTD)} this month · {openCount} open {openCount === 1 ? "invoice" : "invoices"}
          </div>
        </div>
        <div className="page-actions">
          <Link href="/sales" className="btn btn-primary">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New invoice
          </Link>
        </div>
      </div>

      {/* Stat row */}
      <div className="stat-row stat-row-4 mb-5">
        <div className={`stat-card ${revenueMTD > 0 ? "s-success" : ""}`}>
          <div className="stat-label">Month to date</div>
          <div className={`stat-value ${revenueMTD > 0 ? "c-success" : ""}`}>{formatCurrency(revenueMTD)}</div>
          <div className="stat-helper">This month</div>
        </div>
        <div className={`stat-card ${outstandingValue > 0 ? "s-danger" : ""}`}>
          <div className="stat-label">Outstanding</div>
          <div className={`stat-value ${outstandingValue > 0 ? "c-danger" : ""}`}>{formatCurrency(outstandingValue)}</div>
          <div className="stat-helper">{overdueCount} overdue · {pendingCount} pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Paid this month</div>
          <div className="stat-value">{formatCurrency(paidThisMonthValue)}</div>
          <div className="stat-helper">{paidCount} invoices collected</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg open invoice</div>
          <div className="stat-value">{formatCurrency(avgOpenInvoice)}</div>
          <div className="stat-helper">{outstanding.length} outstanding</div>
        </div>
      </div>

      {/* Revenue trend chart */}
      <div className="card mb-5">
        <div className="card-header">
          <div>
            <div className="card-title">Revenue trend</div>
            <div className="card-desc">Last 6 months · MTD figures for {now.toLocaleDateString("en-US", { month: "long" })}</div>
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
        <div className="card-body" style={{ padding: "20px 24px 18px" }}>
          {/* Chart area */}
          <div style={{ position: "relative", height: "120px", display: "flex", alignItems: "flex-end", gap: "10px", marginBottom: "6px" }}>
            {/* Y-axis labels */}
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
              <div style={{ fontSize: "10px", color: "var(--faint)", fontWeight: 600 }}>{formatCurrency(maxVal)}</div>
              <div style={{ fontSize: "10px", color: "var(--faint)", fontWeight: 600 }}>{formatCurrency(maxVal / 2)}</div>
              <div style={{ fontSize: "10px", color: "var(--faint)", fontWeight: 600 }}>$0</div>
            </div>
            {/* Gridlines */}
            <div style={{ position: "absolute", left: "28px", right: 0, top: 0, bottom: 0, pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, borderTop: "1px dashed rgba(0,0,0,0.07)" }} />
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, borderTop: "1px dashed rgba(0,0,0,0.07)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1px solid rgba(0,0,0,0.09)" }} />
            </div>
            {/* Bar groups */}
            <div style={{ flex: 1, marginLeft: "28px", display: "flex", gap: "10px", alignItems: "flex-end", height: "100%" }}>
              {months.map((m, i) => {
                const val = sumSalesForMonth(sales, m.year, m.month);
                const pct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
                const lastYearVal = sumSalesForMonth(sales, m.year - 1, m.month);
                const lastPct = maxVal > 0 ? Math.round((lastYearVal / maxVal) * 100) : 0;
                const isCurrentMonth = m.year === now.getFullYear() && m.month === now.getMonth();
                return (
                  <div key={i} style={{ flex: 1, display: "flex", gap: "3px", alignItems: "flex-end", height: "100%", position: "relative" }}>
                    <div
                      style={{ flex: 1, background: "var(--surface-sunk)", border: "1px solid var(--border)", borderRadius: "4px 4px 0 0", height: `${Math.max(lastPct, 2)}%` }}
                      title={`${m.label} ${m.year - 1} · ${formatCurrency(lastYearVal)}`}
                    />
                    <div
                      style={{ flex: 1, background: "var(--accent)", borderRadius: "4px 4px 0 0", height: `${Math.max(pct, 2)}%`, opacity: isCurrentMonth ? 1 : 0.8, position: "relative" }}
                      title={`${m.label} ${m.year}${isCurrentMonth ? " MTD" : ""} · ${formatCurrency(val)}`}
                    >
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
          {/* X-axis labels */}
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
      <div className="filter-tabs mb-4">
        <button className={`filter-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          All <span style={{ color: "var(--faint)", fontWeight: 500 }}>{count}</span>
        </button>
        <button className={`filter-tab ${filter === "overdue" ? "active" : ""}`} onClick={() => setFilter("overdue")}>
          Overdue <span style={{ color: "var(--danger)", fontWeight: 600 }}>{overdueCount}</span>
        </button>
        <button className={`filter-tab ${filter === "pending" ? "active" : ""}`} onClick={() => setFilter("pending")}>
          Pending <span style={{ color: "var(--faint)", fontWeight: 500 }}>{pendingCount}</span>
        </button>
        <button className={`filter-tab ${filter === "paid" ? "active" : ""}`} onClick={() => setFilter("paid")}>
          Paid <span style={{ color: "var(--faint)", fontWeight: 500 }}>{paidCount}</span>
        </button>
      </div>

      {/* Invoice table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Issued</th>
              <th>Due</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="td-muted" style={{ textAlign: "center", padding: "24px" }}>
                  No invoices found.
                </td>
              </tr>
            ) : (
              filtered.map((sale, i) => {
                const customer = sale.customer_id ? customerById.get(sale.customer_id) : null;
                const isOver = isOverdue(sale.payment_status);
                return (
                  <tr key={sale.id}>
                    <td className="td-primary">#{1000 + i + 1}</td>
                    <td>{customer?.name || sale.service_type || "—"}</td>
                    <td className="td-mono">{formatCurrency(sale.amount)}</td>
                    <td className="td-muted">{formatSaleDate(sale.sale_date || sale.created_at)}</td>
                    <td className={isOver ? "text-danger" : "td-muted"} style={isOver ? { fontWeight: 600 } : undefined}>—</td>
                    <td><span className={statusBadgeClass(sale.payment_status)}>{sale.payment_status || "Pending"}</span></td>
                    <td>
                      {isOver ? (
                        <button className="btn btn-ghost btn-sm">Send reminder</button>
                      ) : (
                        <Link href={`/sales/${sale.id}/edit`} className="td-link">View</Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
