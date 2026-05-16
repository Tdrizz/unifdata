"use client";

import { useActionState } from "react";
import { SectionCard } from "@/components/ui/SectionCard";
import { createJobAction, type ActionState } from "../actions";
import type { CustomerRow, LeadRow } from "../types";
import { formatCurrency } from "@/lib/utils";

type Props = {
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  leads: Pick<LeadRow, "id" | "service_requested" | "status" | "estimated_value">[];
};

export function JobCreateForm({ customers, leads }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createJobAction,
    null,
  );

  return (
    <SectionCard
      title="Add work"
      description="Create work manually and optionally link it to a person or opportunity."
    >
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold text-ud-ink">Quick add</p>
            <p className="mt-1 text-sm text-ud-faint">
              Add a job, project, appointment, service visit, or order.
            </p>
          </div>
          <span className="rounded-[10px] bg-ud-accent px-4 py-3 text-sm font-semibold text-white group-open:hidden">
            Add work
          </span>
          <span className="hidden rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted group-open:inline-flex">
            Close
          </span>
        </summary>

        <form action={formAction} className="border-t border-ud p-5">
          {state?.error && (
            <p className="mb-4 rounded-[10px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-ud-muted">
              Link to person or business
              <select
                name="customer_id"
                className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">No linked person yet</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name || customer.email || customer.phone || "Unnamed person"}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-ud-muted">
              Link to opportunity
              <select
                name="lead_id"
                className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">No linked opportunity yet</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.service_requested || formatCurrency(lead.estimated_value)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
            <label className="text-sm font-medium text-ud-muted">
              Work name
              <input
                name="service_type"
                required
                placeholder="Flooring install, website build, service visit..."
                className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-slate-300"
              />
              {state?.fieldErrors?.service_type && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.service_type}</p>
              )}
            </label>

            <label className="text-sm font-medium text-ud-muted">
              Work value
              <input
                name="job_value"
                type="number"
                step="0.01"
                min="0"
                placeholder="2500"
                className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-slate-300"
              />
              {state?.fieldErrors?.job_value && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.job_value}</p>
              )}
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-ud-muted">
              Work stage
              <select
                name="status"
                defaultValue="Scheduled"
                className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Active">Active</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </label>

            <label className="text-sm font-medium text-ud-muted">
              Payment status
              <select
                name="paid_status"
                defaultValue="Unpaid"
                className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-ud-muted">
              Start date
              <input
                name="start_date"
                type="date"
                className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>

            <label className="text-sm font-medium text-ud-muted">
              Completed date
              <input
                name="completed_date"
                type="date"
                className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="rounded-[10px] bg-ud-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Create work
            </button>
          </div>
        </form>
      </details>
    </SectionCard>
  );
}
