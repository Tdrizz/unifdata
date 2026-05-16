import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { formatDateOnly } from "@/lib/date-format";
import { formatCurrency } from "@/lib/utils";
import { isUnpaid, getRevenueTone } from "@/lib/status";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { SaleRow } from "../types";
import { SaleCreateForm } from "./SaleCreateForm";

const PAGE_SIZE = 50;

type Props = {
  sales: SaleRow[];
  count: number;
  page: number;
  q?: string;
  profile: IndustryProfile;
  selectedStatus: string;
  selectedSource: string;
};

function isPaid(status: string | null) {
  return String(status || "").toLowerCase() === "paid";
}

function getRevenueNextStep(record: SaleRow) {
  if (record.amount === null || record.amount === undefined) {
    return "Add the amount so this revenue is included in reporting.";
  }
  if (!record.payment_status) {
    return "Set the payment status so collected and uncollected revenue are clear.";
  }
  if (isUnpaid(record.payment_status)) {
    return "This revenue still needs collection or payment follow-up.";
  }
  if (!record.source) {
    return "Add a source so revenue can be tied back to what generated it.";
  }
  if (!record.sale_date) {
    return "Add a revenue date so this appears in the right reporting period.";
  }
  return "Revenue looks good. Keep the source and payment status current.";
}

function getRevenueIssues(record: SaleRow) {
  const issues: { label: string; tone: "success" | "warning" | "danger" | "neutral" }[] = [];

  if (record.amount === null || record.amount === undefined) {
    issues.push({ label: "Add amount", tone: "warning" });
  }
  if (!record.payment_status) {
    issues.push({ label: "Add status", tone: "neutral" });
  } else if (isUnpaid(record.payment_status)) {
    issues.push({ label: "Payment needed", tone: "danger" });
  }
  if (!record.source) {
    issues.push({ label: "Add source", tone: "neutral" });
  }
  if (!record.sale_date) {
    issues.push({ label: "Add date", tone: "neutral" });
  }
  if (issues.length === 0) {
    issues.push({ label: "Looks clean", tone: "success" });
  }

  return issues;
}

export function SalesList({ sales, count, page, q, profile, selectedStatus, selectedSource }: Props) {
  const paidRevenue = sales.filter((r) => isPaid(r.payment_status));
  const unpaidRevenue = sales.filter((r) => isUnpaid(r.payment_status));
  const missingSource = sales.filter((r) => !r.source);
  const missingAmount = sales.filter((r) => r.amount === null || r.amount === undefined);
  const missingDate = sales.filter((r) => !r.sale_date);

  const totalRevenue = sales.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const paidTotal = paidRevenue.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const unpaidTotal = unpaidRevenue.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const cleanupGroups = [
    { id: "missing-source", label: "Add source", title: "Revenue needs sources", detail: "Source tracking helps show what generated paid work.", count: missingSource.length, href: "/sales" },
    { id: "missing-amount", label: "Add amount", title: "Revenue needs amounts", detail: "Amounts are required for accurate revenue reporting.", count: missingAmount.length, href: "/sales" },
    { id: "missing-date", label: "Add date", title: "Revenue needs dates", detail: "Revenue dates keep records in the right reporting period.", count: missingDate.length, href: "/sales" },
  ].filter((item) => item.count > 0);

  const prioritizedRevenue = [...sales]
    .sort((a, b) => {
      const aUnpaid = isUnpaid(a.payment_status);
      const bUnpaid = isUnpaid(b.payment_status);
      if (aUnpaid !== bUnpaid) return aUnpaid ? -1 : 1;
      const aMissingSource = !a.source;
      const bMissingSource = !b.source;
      if (aMissingSource !== bMissingSource) return aMissingSource ? -1 : 1;
      return Number(b.amount || 0) - Number(a.amount || 0);
    })
    .slice(0, 25);

  const visibleRevenue = prioritizedRevenue.filter((r) => {
    if (selectedStatus && (r.payment_status || "Not set") !== selectedStatus) return false;
    if (selectedSource && (r.source || "No source") !== selectedSource) return false;
    return true;
  });

  const paymentGroups = Array.from(
    sales.reduce((map, r) => {
      const status = r.payment_status || "Not set";
      const current = map.get(status) || { status, count: 0, amount: 0 };
      current.count += 1;
      current.amount += Number(r.amount || 0);
      map.set(status, current);
      return map;
    }, new Map<string, { status: string; count: number; amount: number }>()),
  )
    .map(([, group]) => group)
    .sort((a, b) => b.amount - a.amount);

  const sourceGroups = Array.from(
    sales.reduce((map, r) => {
      const source = r.source || "No source";
      const current = map.get(source) || { source, count: 0, amount: 0 };
      current.count += 1;
      current.amount += Number(r.amount || 0);
      map.set(source, current);
      return map;
    }, new Map<string, { source: string; count: number; amount: number }>()),
  )
    .map(([, group]) => group)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={profile.labels.salePlural}
        title={`Track ${profile.labels.salePlural.toLowerCase()} and collected work`}
        description={`Use this page to see paid ${profile.labels.salePlural.toLowerCase()}, unpaid ${profile.labels.salePlural.toLowerCase()}, payment status, and what sources are generating money.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/export/csv?table=sales"
              download
              className="inline-flex items-center gap-1 rounded-[8px] border border-ud bg-ud-surface px-3 py-1.5 text-sm font-medium text-ud-muted hover:bg-ud-surface-sunk"
            >
              Export CSV
            </a>

            <Link href="/jobs" className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk">
              Work
            </Link>
            <Link href="/imports" className="rounded-[10px] bg-ud-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
              Import data
            </Link>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total revenue" value={formatCurrency(totalRevenue)} helper={`${sales.length} revenue records`} tone={totalRevenue > 0 ? "positive" : "default"} />
        <StatCard label="Collected" value={formatCurrency(paidTotal)} helper={`${paidRevenue.length} paid records`} tone={paidTotal > 0 ? "positive" : "default"} />
        <StatCard label="Payment needed" value={formatCurrency(unpaidTotal)} helper={`${unpaidRevenue.length} unpaid or partial records`} tone={unpaidTotal > 0 ? "danger" : "positive"} />
        <StatCard label="Cleanup issues" value={cleanupGroups.reduce((sum, item) => sum + item.count, 0)} helper="Missing source, amount, or date" tone={cleanupGroups.length > 0 ? "warning" : "positive"} />
      </section>

      <SaleCreateForm profile={profile} />

      <div>
        <SearchInput placeholder={`Search ${profile.labels.salePlural.toLowerCase()}…`} />
      </div>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr] items-start">
        <SectionCard
          title={selectedStatus ? `${selectedStatus} revenue` : selectedSource ? `${selectedSource} revenue` : "Revenue queue"}
          description={selectedStatus ? `Showing revenue records marked ${selectedStatus}.` : selectedSource ? `Showing revenue records from ${selectedSource}.` : "Revenue records prioritized by payment needs, missing source, and amount."}
        >
          {visibleRevenue.length === 0 ? (
            <EmptyState title="No revenue records found" description="Add revenue manually or import revenue from CSV or Google Sheets." />
          ) : (
            <>
              {(selectedStatus || selectedSource) && (
                <div className="flex items-center justify-between gap-3 border-b border-ud p-4">
                  <p className="text-sm font-semibold text-ud-muted">Filtered by: {selectedStatus || selectedSource}</p>
                  <Link href="/sales" className="rounded-[8px] border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-ud-surface-sunk">Clear filter</Link>
                </div>
              )}
              <div className="divide-y divide-ud">
                {visibleRevenue.map((record) => {
                  const issues = getRevenueIssues(record);
                  return (
                    <Link key={record.id} href={`/sales/${record.id}/edit`} className="block p-4 transition-colors hover:bg-ud-surface-sunk">
                      <div className="grid gap-4 md:grid-cols-[1fr_130px_150px] md:items-start">
                        <div>
                          <p className="font-semibold text-ud-ink">{record.service_type || "Revenue record"}</p>
                          <p className="mt-1 text-sm text-ud-faint">{record.source || "No source saved"}</p>
                          <p className="mt-3 text-sm leading-6 text-ud-muted">{getRevenueNextStep(record)}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {issues.slice(0, 3).map((issue) => (
                              <StatusBadge key={issue.label} tone={issue.tone}>{issue.label}</StatusBadge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-ud-faint">Amount</p>
                          <p className="mt-1 text-sm font-semibold text-ud-muted">{formatCurrency(record.amount)}</p>
                          <p className="mt-3 text-xs font-medium text-ud-faint">Source</p>
                          <p className="mt-1 text-sm font-semibold text-ud-muted">{record.source || "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-ud-faint">Date</p>
                          <p className="mt-1 text-sm font-semibold text-ud-muted">{formatDateOnly(record.sale_date)}</p>
                          <p className="mt-3 text-xs font-medium text-ud-faint">Payment</p>
                          <div className="mt-1">
                            <StatusBadge tone={getRevenueTone(record.payment_status)}>{record.payment_status || "Not set"}</StatusBadge>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Payment status" description="Use this to filter revenue by collection state.">
            {paymentGroups.length === 0 ? (
              <EmptyState title="No payment statuses yet" description="Payment statuses will appear here after revenue records are added." />
            ) : (
              <div className="divide-y divide-ud">
                {paymentGroups.map((group) => (
                  <article key={group.status} className="grid gap-3 p-4 md:grid-cols-[1fr_90px] md:items-center">
                    <div>
                      <StatusBadge tone={getRevenueTone(group.status)}>{group.status}</StatusBadge>
                      <p className="mt-2 font-semibold text-ud-ink">{group.count} Found</p>
                      <p className="mt-1 text-sm leading-6 text-ud-faint">
                        {isUnpaid(group.status) ? "Revenue that still needs collection or review." : isPaid(group.status) ? "Revenue marked as collected." : "Revenue using this payment status."}
                      </p>
                    </div>
                    <div className="md:text-right">
                      <p className="mb-2 text-xs font-medium text-ud-faint">{formatCurrency(group.amount)}</p>
                      <Link href={selectedStatus === group.status ? "/sales" : `/sales?status=${encodeURIComponent(group.status)}`} className="inline-flex rounded-[8px] border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-ud-surface-sunk">
                        {selectedStatus === group.status ? "Clear" : "Review"}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Sources" description="Where revenue is coming from.">
            {sourceGroups.length === 0 ? (
              <EmptyState title="No source data yet" description="Add sources to see which channels generate revenue." />
            ) : (
              <div className="divide-y divide-ud">
                {sourceGroups.map((group) => (
                  <article key={group.source} className="grid gap-3 p-4 md:grid-cols-[1fr_90px] md:items-center">
                    <div>
                      <p className="font-semibold text-ud-ink">{group.source}</p>
                      <p className="mt-1 text-sm text-ud-faint">{group.count} records · {formatCurrency(group.amount)}</p>
                    </div>
                    <div className="md:text-right">
                      <Link href={selectedSource === group.source ? "/sales" : `/sales?source=${encodeURIComponent(group.source)}`} className="inline-flex rounded-[8px] border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-ud-surface-sunk">
                        {selectedSource === group.source ? "Clear" : "Review"}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </section>

      <SectionCard title="Revenue health" description="Cleanup issues that make revenue reporting less reliable.">
        {cleanupGroups.length === 0 ? (
          <EmptyState title="Revenue records look clean" description="No missing source, amount, or date issues were found." />
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-3">
            {cleanupGroups.map((item) => (
              <Link key={item.id} href={item.href} className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4 hover:bg-ud-surface">
                <div className="flex items-start justify-between gap-3">
                  <StatusBadge tone="neutral">{item.label}</StatusBadge>
                  <span className="rounded-full border border-ud bg-ud-surface px-3 py-1 text-xs font-semibold text-ud-muted">{item.count}</span>
                </div>
                <p className="mt-3 font-semibold text-ud-ink">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-ud-faint">{item.detail}</p>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      <Pagination count={count} pageSize={PAGE_SIZE} />
    </div>
  );
}
