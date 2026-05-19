"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { CustomerRow } from "../types";
import type { Database } from "@/types/db";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { CustomerCreateForm } from "./CustomerCreateForm";

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
  if (hasOpenLead) return { label: "Quote pending", badgeClass: "badge badge-warning" };

  const recentJob = jobs.find((j) => j.customer_id === customer.id && j.status === "completed");
  if (recentJob) return { label: "Active", badgeClass: "badge badge-success" };

  return { label: "Dormant", badgeClass: "badge badge-neutral" };
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
    <div className="hidden md:block" style={{ padding: "28px 28px 40px" }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">{custPlural}</div>
          <div className="page-title">All {custPlural.toLowerCase()}</div>
          <div className="page-desc">{customers.length} {custPlural.toLowerCase()}</div>
        </div>
        <div className="page-actions">
          <Link href="/imports" className="btn btn-ghost">Import</Link>
          <a href="#customer-quick-add" className="btn btn-primary">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add {custSingular.toLowerCase()}
          </a>
        </div>
      </div>

      {/* Search bar */}
      <div className="search-bar">
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs mb-4">
        <button className={`filter-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          All <span style={{ color: "var(--faint)", fontWeight: 500 }}>{customers.length}</span>
        </button>
        <button className={`filter-tab ${filter === "active" ? "active" : ""}`} onClick={() => setFilter("active")}>
          Active <span style={{ color: "var(--faint)", fontWeight: 500 }}>{activeCount}</span>
        </button>
        <button className={`filter-tab ${filter === "quote" ? "active" : ""}`} onClick={() => setFilter("quote")}>
          Quote pending <span style={{ color: "var(--faint)", fontWeight: 500 }}>{quoteCount}</span>
        </button>
        <button className={`filter-tab ${filter === "dormant" ? "active" : ""}`} onClick={() => setFilter("dormant")}>
          Dormant <span style={{ color: "var(--faint)", fontWeight: 500 }}>{dormantCount}</span>
        </button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>{jobPlural}</th>
              <th>Lifetime value</th>
              <th>Last {jobPlural.toLowerCase().replace(/s$/, "")}</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="td-muted" style={{ textAlign: "center", padding: "24px" }}>
                  No {custPlural.toLowerCase()} match your filter.
                </td>
              </tr>
            ) : (
              filtered.map((customer) => {
                const s = statsById[customer.id] ?? { lifetime: 0, jobCount: 0, lastJob: null, status: { label: "Dormant", badgeClass: "badge badge-neutral" } };
                const initials = getInitials(customer.name);
                const col = avatarColor(customer.name);
                return (
                  <tr key={customer.id}>
                    <td>
                      <div className="cl-row">
                        <div className="cl-avatar" style={{ background: col.bg, color: col.color }}>{initials}</div>
                        <span className="td-primary">{customer.name || `Unnamed ${custSingular.toLowerCase()}`}</span>
                      </div>
                    </td>
                    <td className="td-muted">{customer.email || customer.phone || "—"}</td>
                    <td className="td-muted">{s.jobCount}</td>
                    <td className="td-mono">{s.lifetime > 0 ? formatCurrency(s.lifetime) : "—"}</td>
                    <td className="td-muted">{s.lastJob || "—"}</td>
                    <td><span className={s.status.badgeClass}>{s.status.label}</span></td>
                    <td><Link href={`/customers/${customer.id}`} className="td-link">View →</Link></td>
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
