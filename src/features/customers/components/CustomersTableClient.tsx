"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { CustomerRow } from "../types";
import type { Database } from "@/types/db";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { CustomerCreateForm } from "./CustomerCreateForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterChip } from "@/components/ui/FilterChip";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];

type Props = {
  customers: CustomerRow[];
  jobs?: JobRow[];
  leads?: LeadRow[];
  sales?: SaleRow[];
  profile?: IndustryProfile;
};

function computeLifetimeRevenue(customer: CustomerRow, sales: SaleRow[]): number {
  return sales
    .filter((s) => s.customer_id === customer.id)
    .reduce((sum, s) => sum + (s.amount ?? 0), 0);
}

function getJobCount(customer: CustomerRow, jobs: JobRow[]): number {
  return jobs.filter((j) => j.customer_id === customer.id).length;
}

function getLastJobDate(customer: CustomerRow, jobs: JobRow[]): string | null {
  const sorted = jobs
    .filter((j) => j.customer_id === customer.id && j.completed_date)
    .sort((a, b) => new Date(b.completed_date!).getTime() - new Date(a.completed_date!).getTime());
  if (!sorted.length) return null;
  return new Date(sorted[0].completed_date!).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCustomerStatus(customer: CustomerRow, leads: LeadRow[], jobs: JobRow[]): { label: string; badgeClass: string } {
  const hasOpenLead = leads.some(
    (l) => l.customer_id === customer.id && l.status !== "closed" && l.status !== "won" && l.status !== "lost",
  );
  if (hasOpenLead) return { label: "Quote pending", badgeClass: "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-warning-bg text-ud-warning" };

  const recentJob = jobs.find((j) => j.customer_id === customer.id && j.status === "completed");
  if (recentJob) return { label: "Active", badgeClass: "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-success-bg text-ud-success" };

  return { label: "Dormant", badgeClass: "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-surface-sunk text-ud-muted" };
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "#f1f5f9", color: "#334155" },
  { bg: "#dcfce7", color: "#166534" },
  { bg: "#e0e7ff", color: "#3730a3" },
  { bg: "#fef3c7", color: "#92400e" },
  { bg: "#ffe4e6", color: "#9f1239" },
  { bg: "#e0f2fe", color: "#0369a1" },
];

function avatarColor(name: string | null) {
  const idx = (name || "").charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

type Filter = "all" | "active" | "quote" | "dormant";

const btnGhost = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-3 py-2 rounded-[9px] bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-[color,border-color] duration-[120ms]";
const btnPrimary = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-3 py-2 rounded-[9px] bg-ud-accent text-white hover:opacity-90 transition-opacity duration-[120ms]";

export function CustomersTableClient({
  customers,
  jobs = [],
  leads = [],
  sales = [],
  profile,
}: Props) {
  const custPlural = profile?.labels.customerPlural ?? "Clients";
  const custSingular = profile?.labels.customerSingular ?? "Client";
  const jobPlural = profile?.labels.jobPlural ?? "Jobs";
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const stats = customers.map((c) => ({
    id: c.id,
    lifetime: computeLifetimeRevenue(c, sales),
    jobCount: getJobCount(c, jobs),
    lastJob: getLastJobDate(c, jobs),
    status: getCustomerStatus(c, leads, jobs),
  }));
  const statsById = Object.fromEntries(stats.map((s) => [s.id, s]));

  const activeCount = stats.filter((s) => s.status.label === "Active").length;
  const quoteCount = stats.filter((s) => s.status.label === "Quote pending").length;
  const dormantCount = stats.filter((s) => s.status.label === "Dormant").length;

  const byFilter = customers.filter((c) => {
    const s = statsById[c.id];
    if (!s) return true;
    if (filter === "active") return s.status.label === "Active";
    if (filter === "quote") return s.status.label === "Quote pending";
    if (filter === "dormant") return s.status.label === "Dormant";
    return true;
  });

  const q = search.toLowerCase().trim();
  const filtered = q
    ? byFilter.filter(
        (c) =>
          (c.name ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q),
      )
    : byFilter;

  return (
    <div className="hidden md:block px-7 pb-10 pt-7">
      <PageHeader
        eyebrow={custPlural}
        title={`All ${custPlural.toLowerCase()}`}
        description={`${customers.length} ${custPlural.toLowerCase()}`}
        className="mb-6"
        actions={
          <>
            <Link href="/imports" className={btnGhost}>Import</Link>
            <a href="#customer-quick-add" className={btnPrimary}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add {custSingular.toLowerCase()}
            </a>
          </>
        }
      />

      {/* Search bar */}
      <div className="flex items-center gap-2.5 px-[14px] py-[9px] bg-ud-surface border border-ud rounded-[10px] shadow-ud mb-4">
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" className="text-ud-faint shrink-0">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border-0 outline-none bg-transparent text-[13.5px] text-ud-ink placeholder:text-ud-faint"
          style={{ fontFamily: "var(--font)" }}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0.5 bg-ud-surface-sunk rounded-[9px] p-[3px] border border-ud w-fit mb-4">
        <FilterChip active={filter === "all"} count={customers.length} onClick={() => setFilter("all")}>All</FilterChip>
        <FilterChip active={filter === "active"} count={activeCount} onClick={() => setFilter("active")}>Active</FilterChip>
        <FilterChip active={filter === "quote"} count={quoteCount} onClick={() => setFilter("quote")}>Quote pending</FilterChip>
        <FilterChip active={filter === "dormant"} count={dormantCount} onClick={() => setFilter("dormant")}>Dormant</FilterChip>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[var(--radius-ud-lg)] border border-[rgba(0,0,0,0.06)] shadow-ud">
        <table className="w-full border-collapse bg-ud-surface">
          <thead>
            <tr>
              {["Name", "Contact", jobPlural, "Lifetime value", `Last ${jobPlural.toLowerCase().replace(/s$/, "")}`, "Status", ""].map((h) => (
                <th key={h} className="px-4 py-[10px] text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint bg-[rgba(0,0,0,0.015)] border-b border-ud whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child_td]:border-b-0 [&_tr:hover_td]:bg-[rgba(0,0,0,0.012)]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-[13px] text-ud-muted text-center">
                  No {custPlural.toLowerCase()} match your filter.
                </td>
              </tr>
            ) : (
              filtered.map((customer) => {
                const s = statsById[customer.id] ?? { lifetime: 0, jobCount: 0, lastJob: null, status: { label: "Dormant", badgeClass: "inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-surface-sunk text-ud-muted" } };
                const initials = getInitials(customer.name);
                const col = avatarColor(customer.name);
                return (
                  <tr key={customer.id}>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: col.bg, color: col.color }}>{initials}</div>
                        <span className="font-semibold text-ud-ink">{customer.name || `Unnamed ${custSingular.toLowerCase()}`}</span>
                      </div>
                    </td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted">{customer.email || customer.phone || "—"}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted">{s.jobCount}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] font-semibold [font-variant-numeric:tabular-nums]">{s.lifetime > 0 ? formatCurrency(s.lifetime) : "—"}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px] text-ud-muted">{s.lastJob || "—"}</td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]"><span className={s.status.badgeClass}>{s.status.label}</span></td>
                    <td className="px-4 py-[13px] border-b border-[rgba(0,0,0,0.04)] text-[13px]"><Link href={`/customers/${customer.id}`} className="text-ud-accent no-underline font-medium text-[12px] hover:underline">View →</Link></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Quick add */}
      {profile && (
        <div id="customer-quick-add" style={{ marginTop: "20px" }}>
          <CustomerCreateForm profile={profile} />
        </div>
      )}
    </div>
  );
}
