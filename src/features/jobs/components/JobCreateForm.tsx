"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { createJobAction, type ActionState } from "../actions";
import type { CustomerRow, LeadRow } from "../types";
import { formatCurrency } from "@/lib/utils";
import { SubmitButton } from "@/components/ui/SubmitButton";

const f = "mt-1.5 w-full rounded-[10px] border border-ud bg-ud-surface-sunk px-4 py-[11px] text-base text-ud-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ud-accent focus:ring-2 focus:ring-ud-accent/15 placeholder:text-ud-faint";

type PricingContext = {
  sufficient: true;
  averageAmount: number;
  sampleSize: number;
} | { sufficient: false };

type Props = {
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  leads: Pick<LeadRow, "id" | "service_requested" | "status" | "estimated_value">[];
};

export function JobCreateForm({ customers, leads }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createJobAction,
    null,
  );

  const [serviceType, setServiceType] = useState("");
  const [jobValue, setJobValue] = useState("");
  const [pricingCtx, setPricingCtx] = useState<PricingContext | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!serviceType.trim()) {
      setPricingCtx(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/jobs/pricing-context?service_type=${encodeURIComponent(serviceType)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as PricingContext;
          setPricingCtx(data);
        }
      } catch {
        // Non-critical — silently ignore network errors
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [serviceType]);

  const belowAverage =
    pricingCtx?.sufficient &&
    jobValue !== "" &&
    Number(jobValue) > 0 &&
    Number(jobValue) < pricingCtx.averageAmount * 0.75;

  return (
    <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
      <div className="px-5 py-4 border-b border-ud-soft">
        <p className="text-sm font-semibold text-ud-ink">Add work</p>
      </div>
      <form action={formAction} className="space-y-4 p-5">
        {state?.error && (
          <p className="rounded-[10px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Link to person or business</span>
            <select name="customer_id" className={f}>
              <option value="">No linked person yet</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name || customer.email || customer.phone || "Unnamed person"}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Link to opportunity</span>
            <select name="lead_id" className={f}>
              <option value="">No linked opportunity yet</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.service_requested || formatCurrency(lead.estimated_value)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <div>
            <label className="block">
              <span className="block text-xs font-semibold text-ud-muted">
                Work name <span className="text-ud-accent">*</span>
              </span>
              <input
                name="service_type"
                required
                placeholder="Flooring install, website build, service visit…"
                className={f}
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              />
            </label>
            {state?.fieldErrors?.service_type && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.service_type}</p>
            )}
          </div>

          <div>
            <label className="block">
              <span className="block text-xs font-semibold text-ud-muted">Work value</span>
              <input
                name="job_value"
                type="number"
                step="0.01"
                min="0"
                placeholder="2500"
                className={f}
                value={jobValue}
                onChange={(e) => setJobValue(e.target.value)}
              />
            </label>
            {state?.fieldErrors?.job_value && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.job_value}</p>
            )}
          </div>
        </div>

        {belowAverage && pricingCtx?.sufficient && (
          <div className="flex items-start gap-2.5 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="mt-0.5 text-amber-500 text-sm leading-none">⚠</span>
            <p className="text-sm text-amber-800">
              This is more than 25% below your workspace average of{" "}
              <strong>{formatCurrency(pricingCtx.averageAmount)}</strong> for similar work
              ({pricingCtx.sampleSize} jobs).
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Work stage</span>
            <select name="status" defaultValue="Scheduled" className={f}>
              <option value="Scheduled">Scheduled</option>
              <option value="Active">Active</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Payment status</span>
            <select name="paid_status" defaultValue="Unpaid" className={f}>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Start date</span>
            <input name="start_date" type="date" className={f} />
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Completed date</span>
            <input name="completed_date" type="date" className={f} />
          </label>
        </div>

        <div className="flex justify-end pt-1">
          <SubmitButton>Create work</SubmitButton>
        </div>
      </form>
    </div>
  );
}
