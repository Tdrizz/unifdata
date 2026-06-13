"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SectionCard } from "@/components/ui/SectionCard";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input, Select } from "@/components/ui/Input";
import { DeleteConfirm } from "@/components/ui/DeleteConfirm";
import { formatDateOnly, formatTimestampDate } from "@/lib/date-format";
import { getDateInputValue, formatCurrency } from "@/lib/utils";
import { getRevenueTone, isUnpaid } from "@/lib/status";
import { updateSaleAction, deleteSaleAction, type ActionState } from "../actions";
import type { SaleRow } from "../types";
import type { ContactForSelect } from "@/lib/crm/types";

type Props = {
  sale: SaleRow;
  contacts: ContactForSelect[];
  errorParam?: string;
};

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
  if (String(record.payment_status || "").toLowerCase() === "paid") {
    return "Revenue is marked collected. Keep the source and date accurate.";
  }
  return "Keep this revenue record updated as payment status changes.";
}

function getRevenueIssues(record: SaleRow) {
  const issues: { label: string; tone: "success" | "warning" | "danger" | "neutral"; detail: string }[] = [];

  if (record.amount === null || record.amount === undefined) {
    issues.push({ label: "Add amount", tone: "warning", detail: "Amount is required for revenue reporting." });
  }
  if (!record.payment_status) {
    issues.push({ label: "Add status", tone: "neutral", detail: "Payment status separates collected and uncollected revenue." });
  } else if (isUnpaid(record.payment_status)) {
    issues.push({ label: "Payment needed", tone: "danger", detail: "This record still needs collection or payment review." });
  }
  if (!record.source) {
    issues.push({ label: "Add source", tone: "neutral", detail: "Source helps show what generated this revenue." });
  }
  if (!record.sale_date) {
    issues.push({ label: "Add date", tone: "neutral", detail: "Revenue date keeps this record in the right reporting period." });
  }
  if (issues.length === 0) {
    issues.push({ label: "Looks clean", tone: "success", detail: "This revenue record has amount, date, source, and payment status." });
  }

  return issues;
}

export function SaleForm({ sale, contacts }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saleContactId = (sale as any).contact_id ?? sale.customer_id ?? "";
  const boundUpdateAction = updateSaleAction.bind(null, sale.id);
  const deleteAction = deleteSaleAction.bind(null, sale.id);
  const issues = getRevenueIssues(sale);

  const [state, formAction] = useActionState<ActionState, FormData>(
    boundUpdateAction,
    null,
  );

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
      <SectionCard
        title="Revenue details"
        description="These fields control how this record appears in Home, Revenue, and reporting."
      >
        <form action={formAction} className="space-y-5 p-5">
          {state?.error && (
            <p className="rounded-[10px] bg-ud-danger-bg border border-ud-danger/20 px-4 py-3 text-sm text-ud-danger">
              {state.error}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Amount">
              <Input name="amount" type="number" step="0.01" min="0" required defaultValue={sale.amount ?? ""} placeholder="2500" />
              {state?.fieldErrors?.amount && (
                <p className="mt-1 text-sm text-ud-danger">{state.fieldErrors.amount}</p>
              )}
            </FormField>
            <FormField label="Payment status">
              <Select name="payment_status" defaultValue={sale.payment_status || "Paid"}>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
              </Select>
            </FormField>
            <FormField label="Revenue date">
              <Input name="sale_date" type="date" defaultValue={getDateInputValue(sale.sale_date)} />
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Service or category">
              <Input name="service_type" defaultValue={sale.service_type || ""} placeholder="Flooring install, website build, monthly service..." />
            </FormField>
            <FormField label="Source">
              <Input name="source" defaultValue={sale.source || ""} placeholder="Referral, Google, Website, Facebook..." />
            </FormField>
          </div>

          {contacts.length > 0 && (
            <FormField label="Link to person">
              <Select name="contact_id" defaultValue={saleContactId}>
                <option value="">No person linked</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField>
          )}

          <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
            <Link href="/sales" className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk">
              Cancel
            </Link>
            <SubmitButton pendingLabel="Updating…">Save revenue</SubmitButton>
          </div>
        </form>
      </SectionCard>

      <div className="space-y-5">
        <SectionCard title="Record summary" description="How this revenue record is currently being interpreted.">
          <div className="space-y-4 p-5">
            <div className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4">
              <p className="text-sm font-medium text-ud-faint">Next step</p>
              <p className="mt-1 text-sm leading-6 text-ud-muted">{getRevenueNextStep(sale)}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <SummaryCard label="Amount" value={formatCurrency(sale.amount)} />
              <div className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4">
                <p className="text-sm font-medium text-ud-faint">Payment</p>
                <div className="mt-2">
                  <StatusBadge tone={getRevenueTone(sale.payment_status)}>{sale.payment_status || "Not set"}</StatusBadge>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <SummaryCard label="Date" value={formatDateOnly(sale.sale_date)} />
              <SummaryCard label="Added" value={formatTimestampDate(sale.created_at)} />
            </div>

            <SummaryCard label="Source" value={sale.source || "No source saved"} helper="Source helps show what generated this revenue." />

            <SummaryCard
              label="Linked person"
              value={saleContactId ? (contacts.find((c) => c.id === saleContactId)?.name ?? "Unknown") : "No person linked"}
              helper="Linking a person connects this revenue to their profile."
            />
          </div>
        </SectionCard>

        <SectionCard title="Cleanup" description="Issues affecting revenue, payment, and source reporting.">
          <div className="space-y-3 p-5">
            {issues.map((issue) => (
              <div key={issue.label} className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge tone={issue.tone}>{issue.label}</StatusBadge>
                  <p className="text-sm font-medium text-ud-faint">{issue.label === "Looks clean" ? "No action needed" : "Needs update"}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-ud-muted">{issue.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Danger zone" description="Permanent actions that cannot be undone.">
          <div className="p-5">
            <DeleteConfirm
              action={deleteAction}
              description="This will permanently delete this revenue record and affect your reporting totals. This cannot be undone."
            />
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
