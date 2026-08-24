import type { SaleRow } from "./types";

// `contact_id` is a newer column not yet reflected in the generated SaleRow
// type — same shape as the legacy `customer_id` fallback used elsewhere.
export function getSaleContactId(sale: SaleRow): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (sale as any).contact_id ?? sale.customer_id ?? null;
}

export function isPaid(status: string | null) {
  return (status || "").toLowerCase() === "paid";
}

export function isOverdue(status: string | null) {
  return (status || "").toLowerCase().includes("overdue");
}

export function isPending(status: string | null) {
  const s = (status || "").toLowerCase();
  return s === "pending" || s === "unpaid" || s === "partial" || (s !== "paid" && !s.includes("overdue"));
}

export function formatSaleDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatRelativeTime(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SOURCE_LABELS: Record<string, string> = {
  quickbooks: "QB",
  stripe: "Stripe",
  square: "Square",
  jobber: "Jobber",
};

export function sourceBadge(sourceSystem: string | null | undefined) {
  if (!sourceSystem) return null;
  return SOURCE_LABELS[sourceSystem.toLowerCase()] ?? sourceSystem.toUpperCase().slice(0, 4);
}

export function getLastNMonths(n: number, now: Date) {
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString("en-US", { month: "short" }) });
  }
  return months;
}

export function sumSalesForMonth(sales: SaleRow[], year: number, month: number) {
  return sales
    .filter((s) => {
      const d = new Date(s.sale_date || s.created_at);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
}

export function computeSalesStats(sales: SaleRow[]) {
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

  return {
    now,
    revenueMTD,
    outstanding,
    outstandingValue,
    paidThisMonth,
    paidThisMonthValue,
    avgOpenInvoice,
    overdueCount,
    pendingCount,
    paidCount,
    openCount: outstanding.length,
  };
}
