"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { FilterChip } from "@/components/ui/FilterChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Pill";
import { cn, formatCurrency } from "@/lib/utils";
import type { CustomerRow } from "../types";
import type { Database } from "@/types/db";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];

type Props = {
  customers: CustomerRow[];
  jobs?: JobRow[];
  leads?: LeadRow[];
  sales?: SaleRow[];
};

// Helper: sum sales amounts for a customer
function computeLifetimeRevenue(customer: CustomerRow, sales: SaleRow[]): number {
  return sales
    .filter((s) => s.customer_id === customer.id)
    .reduce((sum, s) => sum + (s.amount ?? 0), 0);
}

// Helper: count open leads + active jobs for a customer
function computeOpenCount(customer: CustomerRow, leads: LeadRow[], jobs: JobRow[]): number {
  const openLeads = leads.filter(
    (l) => l.customer_id === customer.id && l.status !== "closed" && l.status !== "won" && l.status !== "lost",
  ).length;
  const openJobs = jobs.filter(
    (j) => j.customer_id === customer.id && j.status !== "completed" && j.status !== "cancelled",
  ).length;
  return openLeads + openJobs;
}

// Helper: check for missing contact fields
function getMissingFields(customer: CustomerRow): string[] {
  const missing: string[] = [];
  if (!customer.phone) missing.push("phone");
  if (!customer.email) missing.push("email");
  return missing;
}

// Helper: extract city from address string
function extractCity(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",");
  if (parts.length >= 2) {
    return parts[parts.length - 2]?.trim() || null;
  }
  return parts[0]?.trim() || null;
}

// Helper: find most recent completed job date
function getLastVisit(customer: CustomerRow, jobs: JobRow[]): string | null {
  const completed = jobs
    .filter((j) => j.customer_id === customer.id && j.status === "completed" && j.completed_date)
    .sort((a, b) => {
      const aDate = new Date(a.completed_date!).getTime();
      const bDate = new Date(b.completed_date!).getTime();
      return bDate - aDate;
    });

  if (completed.length === 0) return null;
  const date = new Date(completed[0].completed_date!);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Search input (controlled, client-side only)
function InlineSearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 rounded-[10px] bg-ud-surface-sunk border border-ud px-3 py-[7px] focus-within:border-ud-hard transition-colors", className)}>
      <svg className="h-3.5 w-3.5 shrink-0 text-ud-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search…"}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-ud-ink outline-none placeholder:text-ud-faint"
      />
    </div>
  );
}

type Filter = "all" | "open" | "missing" | "top";

export function CustomersTableClient({
  customers,
  jobs = [],
  leads = [],
  sales = [],
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  // Pre-compute per-customer stats
  const stats = customers.map((c) => ({
    id: c.id,
    lifetime: computeLifetimeRevenue(c, sales),
    openCount: computeOpenCount(c, leads, jobs),
    missing: getMissingFields(c),
    lastVisit: getLastVisit(c, jobs),
  }));

  const statsById = Object.fromEntries(stats.map((s) => [s.id, s]));

  // Filter counts
  const openCount = stats.filter((s) => s.openCount > 0).length;
  const missingCount = stats.filter((s) => s.missing.length > 0).length;
  const TOP_THRESHOLD = (() => {
    const sorted = [...stats].sort((a, b) => b.lifetime - a.lifetime);
    const top20 = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.2)));
    return top20[top20.length - 1]?.lifetime ?? 0;
  })();
  const topCount = stats.filter((s) => s.lifetime >= TOP_THRESHOLD && s.lifetime > 0).length;

  // Apply filter
  const byFilter = customers.filter((c) => {
    const s = statsById[c.id];
    if (!s) return true;
    if (filter === "open") return s.openCount > 0;
    if (filter === "missing") return s.missing.length > 0;
    if (filter === "top") return s.lifetime >= TOP_THRESHOLD && s.lifetime > 0;
    return true;
  });

  // Apply search
  const q = search.toLowerCase().trim();
  const filteredCustomers = q
    ? byFilter.filter(
        (c) =>
          (c.name ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q),
      )
    : byFilter;

  const totalLifetime = stats.reduce((sum, s) => sum + s.lifetime, 0);

  return (
    <div className="hidden md:block">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-[14px] mb-[14px] flex-wrap">
        {/* Left: filter chips */}
        <div className="flex gap-[6px] flex-wrap">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All {customers.length}
          </FilterChip>
          <FilterChip active={filter === "open"} onClick={() => setFilter("open")}>
            With open work {openCount}
          </FilterChip>
          <FilterChip active={filter === "missing"} onClick={() => setFilter("missing")}>
            Missing info {missingCount}
          </FilterChip>
          <FilterChip active={filter === "top"} onClick={() => setFilter("top")}>
            Top revenue {topCount}
          </FilterChip>
        </div>

        {/* Right: search + icon buttons */}
        <div className="flex items-center gap-2">
          <InlineSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search…"
            className="w-[160px]"
          />
          {/* Filter icon button */}
          <button className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] border border-ud bg-ud-surface text-ud-faint hover:text-ud-text transition-colors">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
          </button>
          {/* Column picker icon button */}
          <button className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] border border-ud bg-ud-surface text-ud-faint hover:text-ud-text transition-colors">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="18" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table card */}
      <Card padding={0} radius="lg" className="overflow-hidden shadow-ud">
        {/* Header row */}
        <div className="grid grid-cols-[2.4fr_1.3fr_1.1fr_1fr_1fr_80px] gap-[14px] px-[22px] py-[11px] bg-ud-surface-soft border-b border-ud-soft text-[10.5px] font-bold uppercase tracking-[0.08em] text-ud-muted">
          <span>Client</span>
          <span>Contact</span>
          <span>City</span>
          <span className="text-right">Lifetime ↓</span>
          <span className="text-right">Last visit</span>
          <span className="text-right">Open</span>
        </div>

        {/* Body rows */}
        {filteredCustomers.length === 0 ? (
          <EmptyState
            title="No clients found"
            description="Try a different filter or search term."
          />
        ) : (
          filteredCustomers.map((customer, i) => {
            const s = statsById[customer.id] ?? {
              lifetime: 0,
              openCount: 0,
              missing: [],
              lastVisit: null,
            };

            return (
              <Link key={customer.id} href={`/customers/${customer.id}`}>
                <div
                  className={cn(
                    "grid grid-cols-[2.4fr_1.3fr_1.1fr_1fr_1fr_80px] gap-[14px] px-[22px] py-[14px] border-b border-ud-soft hover:bg-ud-surface-soft transition-colors cursor-pointer",
                    i === filteredCustomers.length - 1 && "border-0",
                  )}
                >
                  {/* Client cell */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Avatar name={customer.name || "?"} size={32} />
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold tracking-[-0.005em] text-ud-ink truncate">
                        {customer.name}
                      </p>
                      {s.missing.length > 0 && (
                        <Pill tone="warning" className="mt-1 text-[10px]">
                          Missing {s.missing.join(", ")}
                        </Pill>
                      )}
                      {s.lifetime === 0 && s.missing.length === 0 && (
                        <Pill tone="info" className="mt-1 text-[10px]">
                          New lead
                        </Pill>
                      )}
                    </div>
                  </div>

                  {/* Contact */}
                  <p className="text-[12.5px] text-ud-text font-medium truncate self-center">
                    {customer.email || customer.phone || "—"}
                  </p>

                  {/* City */}
                  <p className="text-[12.5px] text-ud-muted font-medium self-center">
                    {extractCity(customer.address) || "—"}
                  </p>

                  {/* Lifetime — right aligned */}
                  <p className="udv2-num text-[13.5px] font-semibold text-ud-ink tracking-[-0.01em] text-right self-center">
                    {s.lifetime > 0 ? (
                      formatCurrency(s.lifetime)
                    ) : (
                      <span className="text-ud-faint">—</span>
                    )}
                  </p>

                  {/* Last visit */}
                  <p className="text-[12.5px] text-ud-muted text-right self-center">
                    {s.lastVisit || "—"}
                  </p>

                  {/* Open count */}
                  <div className="text-right self-center">
                    {s.openCount > 0 ? (
                      <Pill tone="accent">{s.openCount}</Pill>
                    ) : (
                      <span className="text-ud-faint">—</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </Card>

      {/* Footer */}
      <div className="flex justify-between items-center mt-[16px] text-[12.5px] text-ud-muted font-medium">
        <span>
          Showing {filteredCustomers.length} of {customers.length}
        </span>
        <span>
          Total lifetime:{" "}
          <span className="udv2-num text-ud-ink font-semibold">
            {formatCurrency(totalLifetime)}
          </span>
        </span>
      </div>
    </div>
  );
}
