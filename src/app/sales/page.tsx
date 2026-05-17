import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DismissError } from "@/components/ui/DismissError";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { formatDateOnly, getTodayString } from "@/lib/date-format";
import { formatCurrency, getFormString, getOptionalNumber } from "@/lib/utils";
import { isUnpaid, getRevenueTone } from "@/lib/status";
import { getIndustryProfile } from "@/lib/industry-profiles";

type RevenueRecord = {
  id: string;
  amount: number | null;
  payment_status: string | null;
  sale_date: string | null;
  service_type: string | null;
  source: string | null;
  created_at: string;
};

function isPaid(status: string | null) {
  return String(status || "").toLowerCase() === "paid";
}

function getRevenueNextStep(record: RevenueRecord) {
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

function getRevenueIssues(record: RevenueRecord) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
  }[] = [];

  if (record.amount === null || record.amount === undefined) {
    issues.push({
      label: "Add amount",
      tone: "warning",
    });
  }

  if (!record.payment_status) {
    issues.push({
      label: "Add status",
      tone: "neutral",
    });
  } else if (isUnpaid(record.payment_status)) {
    issues.push({
      label: "Payment needed",
      tone: "danger",
    });
  }

  if (!record.source) {
    issues.push({
      label: "Add source",
      tone: "neutral",
    });
  }

  if (!record.sale_date) {
    issues.push({
      label: "Add date",
      tone: "neutral",
    });
  }

  if (issues.length === 0) {
    issues.push({
      label: "Looks clean",
      tone: "success",
    });
  }

  return issues;
}

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; error?: string }>;
}) {
  const params = await searchParams;
  const selectedStatus = params.status ? decodeURIComponent(params.status) : "";
  const selectedSource = params.source ? decodeURIComponent(params.source) : "";
  const errorParam = params.error ? decodeURIComponent(params.error) : "";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentCompany = await getCurrentCompany();

  if (!currentCompany) {
    redirect("/onboarding");
  }

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

  async function createRevenue(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const currentCompany = await getCurrentCompany();

    if (!currentCompany) {
      redirect("/onboarding");
    }

    const { company } = currentCompany;

    const amount = getOptionalNumber(formData, "amount");
    const paymentStatus = getFormString(formData, "payment_status") || "Paid";
    const saleDate = getFormString(formData, "sale_date") || getTodayString();
    const serviceType = getFormString(formData, "service_type");
    const source = getFormString(formData, "source");

    if (amount === null) {
      redirect("/sales?error=Revenue+amount+is+required.");
    }

    const { error } = await supabase.from("sales").insert({
      company_id: company.id,
      amount,
      payment_status: paymentStatus,
      sale_date: saleDate || null,
      service_type: serviceType || null,
      source: source || null,
    });

    if (error) {
      redirect(`/sales?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/sales");
    revalidatePath("/workspace");
    redirect("/sales");
  }

  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, amount, payment_status, sale_date, service_type, source, created_at",
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    throw new Error(error.message);
  }

  const revenueRecords = (data || []) as RevenueRecord[];

  const paidRevenue = revenueRecords.filter((record) =>
    isPaid(record.payment_status),
  );

  const unpaidRevenue = revenueRecords.filter((record) =>
    isUnpaid(record.payment_status),
  );

  const missingSource = revenueRecords.filter((record) => !record.source);

  const missingAmount = revenueRecords.filter(
    (record) => record.amount === null || record.amount === undefined,
  );

  const missingDate = revenueRecords.filter((record) => !record.sale_date);

  const totalRevenue = revenueRecords.reduce(
    (sum, record) => sum + Number(record.amount || 0),
    0,
  );

  const paidTotal = paidRevenue.reduce(
    (sum, record) => sum + Number(record.amount || 0),
    0,
  );

  const unpaidTotal = unpaidRevenue.reduce(
    (sum, record) => sum + Number(record.amount || 0),
    0,
  );

  const cleanupGroups = [
    {
      id: "missing-source",
      label: "Add source",
      title: "Revenue needs sources",
      detail: "Source tracking helps show what generated paid work.",
      count: missingSource.length,
      href: "/sales",
    },
    {
      id: "missing-amount",
      label: "Add amount",
      title: "Revenue needs amounts",
      detail: "Amounts are required for accurate revenue reporting.",
      count: missingAmount.length,
      href: "/sales",
    },
    {
      id: "missing-date",
      label: "Add date",
      title: "Revenue needs dates",
      detail: "Revenue dates keep records in the right reporting period.",
      count: missingDate.length,
      href: "/sales",
    },
  ].filter((item) => item.count > 0);

  const prioritizedRevenue = [...revenueRecords]
    .sort((a, b) => {
      const aUnpaid = isUnpaid(a.payment_status);
      const bUnpaid = isUnpaid(b.payment_status);

      if (aUnpaid !== bUnpaid) {
        return aUnpaid ? -1 : 1;
      }

      const aMissingSource = !a.source;
      const bMissingSource = !b.source;

      if (aMissingSource !== bMissingSource) {
        return aMissingSource ? -1 : 1;
      }

      return Number(b.amount || 0) - Number(a.amount || 0);
    })
    .slice(0, 25);

  const visibleRevenue = prioritizedRevenue.filter((record) => {
    if (
      selectedStatus &&
      (record.payment_status || "Not set") !== selectedStatus
    ) {
      return false;
    }

    if (selectedSource && (record.source || "No source") !== selectedSource) {
      return false;
    }

    return true;
  });

  const paymentGroups = Array.from(
    revenueRecords.reduce((map, record) => {
      const status = record.payment_status || "Not set";
      const current = map.get(status) || {
        status,
        count: 0,
        amount: 0,
      };

      current.count += 1;
      current.amount += Number(record.amount || 0);
      map.set(status, current);

      return map;
    }, new Map<string, { status: string; count: number; amount: number }>()),
  )
    .map(([, group]) => group)
    .sort((a, b) => b.amount - a.amount);

  const sourceGroups = Array.from(
    revenueRecords.reduce((map, record) => {
      const source = record.source || "No source";
      const current = map.get(source) || {
        source,
        count: 0,
        amount: 0,
      };

      current.count += 1;
      current.amount += Number(record.amount || 0);
      map.set(source, current);

      return map;
    }, new Map<string, { source: string; count: number; amount: number }>()),
  )
    .map(([, group]) => group)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
      businessSector={company.business_sector}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow={profile.labels.salePlural}
          title={`Track ${profile.labels.salePlural.toLowerCase()} and collected work`}
          description={`Use this page to see paid ${profile.labels.salePlural.toLowerCase()}, unpaid ${profile.labels.salePlural.toLowerCase()}, payment status, and what sources are generating money.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-3 py-2 text-[13px] font-semibold text-ud-muted hover:text-ud-ink"
              >
                Work
              </Link>

              <Link
                href="/imports"
                className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#4A3FA8] px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90"
              >
                Import data
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total revenue"
            value={formatCurrency(totalRevenue)}
            helper={`${revenueRecords.length} revenue records`}
            tone={totalRevenue > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Collected"
            value={formatCurrency(paidTotal)}
            helper={`${paidRevenue.length} paid records`}
            tone={paidTotal > 0 ? "positive" : "default"}
          />

          <StatCard
            label="Payment needed"
            value={formatCurrency(unpaidTotal)}
            helper={`${unpaidRevenue.length} unpaid or partial records`}
            tone={unpaidTotal > 0 ? "danger" : "positive"}
          />

          <StatCard
            label="Cleanup issues"
            value={cleanupGroups.reduce((sum, item) => sum + item.count, 0)}
            helper="Missing source, amount, or date"
            tone={cleanupGroups.length > 0 ? "warning" : "positive"}
          />
        </section>

        <SectionCard
          title="Add revenue"
          description="Create a payment or revenue record manually."
        >
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
              <div>
                <p className="text-[13.5px] font-semibold text-ud-ink">Quick add</p>
                <p className="mt-1 text-[13px] text-ud-muted">
                  Add collected revenue, unpaid invoices, deposits, or partial
                  payments.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#4A3FA8] px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90 group-open:hidden">
                Add revenue
              </span>

              <span className="hidden items-center gap-1.5 rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-3 py-2 text-[13px] font-semibold text-ud-muted hover:text-ud-ink group-open:inline-flex">
                Close
              </span>
            </summary>

            <form
              action={createRevenue}
              className="border-t border-[rgba(23,22,20,0.05)] p-5"
            >
              {errorParam && <DismissError message={errorParam} />}

              <div className="grid gap-4 md:grid-cols-[0.7fr_0.7fr_1fr]">
                <label className="text-sm font-medium text-ud-muted">
                  Amount
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="2500"
                    className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                  />
                </label>

                <label className="text-sm font-medium text-ud-muted">
                  Payment status
                  <select
                    name="payment_status"
                    defaultValue="Paid"
                    className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partial">Partial</option>
                    <option value="Pending">Pending</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-ud-muted">
                  Revenue date
                  <input
                    name="sale_date"
                    type="date"
                    defaultValue={getTodayString()}
                    className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-ud-muted">
                  Service or category
                  <input
                    name="service_type"
                    placeholder="Flooring install, website build, monthly service..."
                    className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                  />
                </label>

                <label className="text-sm font-medium text-ud-muted">
                  Source
                  <input
                    name="source"
                    placeholder="Referral, Google, Website, Facebook..."
                    className="mt-2 w-full rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-[#4A3FA8]/30"
                  />
                </label>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#4A3FA8] px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90"
                >
                  Create revenue
                </button>
              </div>
            </form>
          </details>
        </SectionCard>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr] items-start">
          <SectionCard
            title={
              selectedStatus
                ? `${selectedStatus} revenue`
                : selectedSource
                  ? `${selectedSource} revenue`
                  : "Revenue queue"
            }
            description={
              selectedStatus
                ? `Showing revenue records marked ${selectedStatus}.`
                : selectedSource
                  ? `Showing revenue records from ${selectedSource}.`
                  : "Revenue records prioritized by payment needs, missing source, and amount."
            }
          >
            {visibleRevenue.length === 0 ? (
              <EmptyState
                title="No revenue records found"
                description="Add revenue manually or import revenue from CSV or Google Sheets."
              />
            ) : (
              <>
                {(selectedStatus || selectedSource) && (
                  <div className="flex items-center justify-between gap-3 border-b border-[rgba(23,22,20,0.04)] p-4">
                    <p className="text-[13.5px] font-semibold text-ud-ink">
                      Filtered by: {selectedStatus || selectedSource}
                    </p>

                    <Link
                      href="/sales"
                      className="inline-flex items-center gap-1.5 rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface px-3 py-2 text-[13px] font-semibold text-ud-muted hover:text-ud-ink"
                    >
                      Clear filter
                    </Link>
                  </div>
                )}

                <div>
                  {visibleRevenue.map((record) => {
                    const issues = getRevenueIssues(record);

                    return (
                      <div
                        key={record.id}
                        className="flex items-center gap-3.5 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 hover:bg-ud-surface-soft transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-semibold text-ud-ink truncate">
                            {record.service_type || "Revenue record"}
                          </p>
                          <p className="text-[12px] text-ud-muted mt-0.5 truncate">
                            {record.source || "No source saved"}
                            {record.sale_date ? ` · ${formatDateOnly(record.sale_date)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <StatusBadge tone={getRevenueTone(record.payment_status)}>
                            {record.payment_status || "Not set"}
                          </StatusBadge>
                          {issues[0] && (
                            <StatusBadge tone={issues[0].tone}>
                              {issues[0].label}
                            </StatusBadge>
                          )}
                          <span className="text-[12px] text-ud-muted hidden md:block">
                            {formatCurrency(record.amount)}
                          </span>
                          <Link
                            href={`/sales/${record.id}/edit`}
                            className="text-[12px] font-semibold text-[#4A3FA8] hover:underline"
                          >
                            Open →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="Payment status"
              description="Use this to filter revenue by collection state."
            >
              {paymentGroups.length === 0 ? (
                <EmptyState
                  title="No payment statuses yet"
                  description="Payment statuses will appear here after revenue records are added."
                />
              ) : (
                <div>
                  {paymentGroups.map((group) => (
                    <div
                      key={group.status}
                      className="flex items-center gap-3.5 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 hover:bg-ud-surface-soft transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-ud-ink truncate">
                          {group.count} {group.status}
                        </p>
                        <p className="text-[12px] text-ud-muted mt-0.5 truncate">
                          {isUnpaid(group.status)
                            ? "Revenue that still needs collection or review."
                            : isPaid(group.status)
                              ? "Revenue marked as collected."
                              : "Revenue using this payment status."}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge tone={getRevenueTone(group.status)}>
                          {group.status}
                        </StatusBadge>
                        <span className="text-[12px] text-ud-muted hidden sm:block">
                          {formatCurrency(group.amount)}
                        </span>
                        <Link
                          href={
                            selectedStatus === group.status
                              ? "/sales"
                              : `/sales?status=${encodeURIComponent(group.status)}`
                          }
                          className="text-[12px] font-semibold text-[#4A3FA8] hover:underline"
                        >
                          {selectedStatus === group.status ? "Clear" : "Review →"}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Sources"
              description="Where revenue is coming from."
            >
              {sourceGroups.length === 0 ? (
                <EmptyState
                  title="No source data yet"
                  description="Add sources to see which channels generate revenue."
                />
              ) : (
                <div>
                  {sourceGroups.map((group) => (
                    <div
                      key={group.source}
                      className="flex items-center gap-3.5 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 hover:bg-ud-surface-soft transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-ud-ink truncate">
                          {group.source}
                        </p>
                        <p className="text-[12px] text-ud-muted mt-0.5">
                          {group.count} records · {formatCurrency(group.amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Link
                          href={
                            selectedSource === group.source
                              ? "/sales"
                              : `/sales?source=${encodeURIComponent(group.source)}`
                          }
                          className="text-[12px] font-semibold text-[#4A3FA8] hover:underline"
                        >
                          {selectedSource === group.source ? "Clear" : "Review →"}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </section>

        <SectionCard
          title="Revenue health"
          description="Cleanup issues that make revenue reporting less reliable."
        >
          {cleanupGroups.length === 0 ? (
            <EmptyState
              title="Revenue records look clean"
              description="No missing source, amount, or date issues were found."
            />
          ) : (
            <div>
              {cleanupGroups.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3.5 px-5 py-[13px] border-b border-[rgba(23,22,20,0.04)] last:border-0 hover:bg-ud-surface-soft transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-ud-ink truncate">
                      {item.title}
                    </p>
                    <p className="text-[12px] text-ud-muted mt-0.5 truncate">
                      {item.detail}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge tone="neutral">{item.label}</StatusBadge>
                    <span className="rounded-full bg-ud-surface-sunk px-3 py-1 text-xs font-semibold text-ud-muted">
                      {item.count}
                    </span>
                    <Link
                      href={item.href}
                      className="text-[12px] font-semibold text-[#4A3FA8] hover:underline"
                    >
                      Review →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}




