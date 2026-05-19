"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { FilterChip } from "@/components/ui/FilterChip";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Pill";
import { Display } from "@/components/ui/Display";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatCurrency } from "@/lib/utils";
import { CustomerCreateForm } from "./CustomerCreateForm";
import type { CustomerRow } from "../types";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { Database } from "@/types/db";

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

type Filter = "all" | "open" | "missing" | "top";

// Helper: sum sales amounts for a customer
function computeLifetimeRevenue(customerId: string, sales: SaleRow[]): number {
  return sales
    .filter((s) => s.customer_id === customerId)
    .reduce((sum, s) => sum + (s.amount ?? 0), 0);
}

// Helper: count open leads + active jobs for a customer
function computeOpenCount(customerId: string, leads: LeadRow[], jobs: JobRow[]): number {
  const openLeads = leads.filter(
    (l) => l.customer_id === customerId && l.status !== "closed" && l.status !== "won" && l.status !== "lost",
  ).length;
  const openJobs = jobs.filter(
    (j) => j.customer_id === customerId && j.status !== "completed" && j.status !== "cancelled",
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

// Helper: relative time label for last visit
function getRelativeTime(customerId: string, jobs: JobRow[]): string | null {
  const completed = jobs
    .filter((j) => j.customer_id === customerId && j.status === "completed" && j.completed_date)
    .sort((a, b) => new Date(b.completed_date!).getTime() - new Date(a.completed_date!).getTime());

  if (completed.length === 0) return null;

  const date = new Date(completed[0].completed_date!);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  if (diffDays < 31) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return "1 month ago";
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function CustomersList({
  customers,
  jobs = [],
  leads = [],
  sales = [],
  profile,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  // Pre-compute per-customer stats
  const stats = customers.map((c) => ({
    id: c.id,
    lifetime: computeLifetimeRevenue(c.id, sales),
    openCount: computeOpenCount(c.id, leads, jobs),
    missing: getMissingFields(c),
    lastVisitRelative: getRelativeTime(c.id, jobs),
    city: extractCity(c.address),
  }));

  const statsById = Object.fromEntries(stats.map((s) => [s.id, s]));

  // Filter counts
  const openCount = stats.filter((s) => s.openCount > 0).length;
  const missingCount = stats.filter((s) => s.missing.length > 0).length;
  const sortedByLifetime = [...stats].sort((a, b) => b.lifetime - a.lifetime);
  const top20 = sortedByLifetime.slice(0, Math.max(1, Math.ceil(sortedByLifetime.length * 0.2)));
  const topThreshold = top20[top20.length - 1]?.lifetime ?? 0;
  const topCount = stats.filter((s) => s.lifetime >= topThreshold && s.lifetime > 0).length;

  // Apply filter
  const byFilter = customers.filter((c) => {
    const s = statsById[c.id];
    if (!s) return true;
    if (filter === "open") return s.openCount > 0;
    if (filter === "missing") return s.missing.length > 0;
    if (filter === "top") return s.lifetime >= topThreshold && s.lifetime > 0;
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

  return (
    <div className="block md:hidden">
      {/* 1. Title block */}
      <div className="px-[18px] pt-[18px] pb-[12px]">
        <p className="text-[10.5px] font-semibold uppercase tracking-eyebrow text-ud-muted mb-1">
          {profile?.labels.customerPlural ?? "Clients"}
        </p>
        <span className="flex items-baseline gap-2">
          <Display size={36}>{customers.length}</Display>
          <span className="text-[20px] text-ud-muted font-medium">{(profile?.labels.customerPlural ?? "Clients").toLowerCase()}</span>
        </span>

        {/* Search */}
        <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-ud-surface-sunk border border-ud px-3 py-2.5 focus-within:border-ud-hard transition-colors">
          <svg className="h-4 w-4 shrink-0 text-ud-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="min-w-0 flex-1 bg-transparent text-sm text-ud-ink outline-none placeholder:text-ud-faint"
          />
        </div>
      </div>

      {/* 2. Filter chips */}
      <div className="px-[18px] pb-[14px] overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-[2px] bg-ud-surface-sunk border border-ud rounded-[9px] p-[3px] w-fit mb-4">
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
      </div>

      {/* 3. Client list card */}
      <Card padding={0}>
        {filteredCustomers.length === 0 ? (
          <EmptyState
            title={`No ${(profile?.labels.customerPlural ?? "clients").toLowerCase()} found`}
            description="Try a different filter or search term."
          />
        ) : (
          filteredCustomers.map((customer, i) => {
            const s = statsById[customer.id] ?? {
              lifetime: 0,
              openCount: 0,
              missing: [],
              lastVisitRelative: null,
              city: null,
            };

            const contact = customer.email || customer.phone;
            const metaParts = [contact, s.city].filter(Boolean).join(" · ");

            return (
              <Link key={customer.id} href={`/customers/${customer.id}`}>
                <div
                  className={cn(
                    "px-[14px] py-[13px] border-b border-ud-soft flex items-start gap-3",
                    i === filteredCustomers.length - 1 && "border-0",
                  )}
                >
                  <Avatar name={customer.name || "?"} size={38} />

                  <div className="min-w-0 flex-1">
                    {/* Top: name + open pill */}
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[14px] text-ud-ink truncate flex-1">
                        {customer.name || `Unnamed ${(profile?.labels.customerSingular ?? "client").toLowerCase()}`}
                      </p>
                      {s.openCount > 0 && (
                        <Pill tone="accent">{s.openCount}</Pill>
                      )}
                    </div>

                    {/* Sub: contact + city */}
                    {metaParts && (
                      <p className="text-[12.5px] text-ud-muted mt-[2px] truncate">
                        {metaParts}
                      </p>
                    )}

                    {/* Bottom meta */}
                    <div className="mt-[4px]">
                      {s.missing.length > 0 ? (
                        <Pill tone="warning">Missing {s.missing.join(", ")}</Pill>
                      ) : s.lifetime > 0 ? (
                        <span className="udv2-num text-[11.5px] text-ud-muted">
                          {formatCurrency(s.lifetime)}
                          {s.lastVisitRelative && (
                            <> · {s.lastVisitRelative}</>
                          )}
                        </span>
                      ) : (
                        <Pill tone="info">New {(profile?.labels.leadSingular ?? "lead").toLowerCase()}</Pill>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <svg
                    width={12}
                    height={12}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-ud-faint ml-auto shrink-0 self-center"
                  >
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })
        )}
      </Card>

      {/* 4. Inline create form */}
      {profile && (
        <div id="customer-quick-add" className="px-[14px] pb-[16px]">
          <CustomerCreateForm profile={profile} />
        </div>
      )}
    </div>
  );
}
