"use client";

import { useActionState } from "react";
import { createLeadAction, type ActionState } from "../actions";
import type { CustomerRow } from "../types";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { SubmitButton } from "@/components/ui/SubmitButton";

const f = "mt-1.5 w-full rounded-[10px] border border-ud bg-ud-surface-sunk px-4 py-[11px] text-base text-ud-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ud-accent focus:ring-2 focus:ring-ud-accent/15 placeholder:text-ud-faint";

type Props = {
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  profile: IndustryProfile;
};

export function LeadCreateForm({ customers, profile }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createLeadAction,
    null,
  );

  return (
    <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
      <div className="px-5 py-4 border-b border-ud-soft">
        <p className="text-sm font-semibold text-ud-ink">
          Add {profile.labels.leadSingular.toLowerCase()}
        </p>
      </div>
      <form action={formAction} className="space-y-4 p-5">
        {state?.error && (
          <p className="rounded-[10px] bg-ud-danger-bg border border-ud-danger/20 px-4 py-3 text-sm text-ud-danger">
            {state.error}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Link to person or business</span>
            <select name="customer_id" className={f}>
              <option value="">No linked {profile.labels.customerSingular.toLowerCase()} yet</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name || customer.email || customer.phone || "Unnamed person"}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Status</span>
            <select name="status" defaultValue="New" className={f}>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Estimate Sent">Estimate Sent</option>
              <option value="Follow Up">Follow Up</option>
              <option value="Won">{profile.completedLabel}</option>
              <option value="Lost">{profile.cancelledLabel}</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <div>
            <label className="block">
              <span className="block text-xs font-semibold text-ud-muted">
                {profile.labels.leadSingular} name <span className="text-ud-accent">*</span>
              </span>
              <input
                name="service_requested"
                required
                placeholder="Website redesign, flooring quote, monthly service plan…"
                className={f}
              />
            </label>
            {state?.fieldErrors?.service_requested && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.service_requested}</p>
            )}
          </div>

          <div>
            <label className="block">
              <span className="block text-xs font-semibold text-ud-muted">Estimated value</span>
              <input
                name="estimated_value"
                type="number"
                step="0.01"
                min="0"
                placeholder="2500"
                className={f}
              />
            </label>
            {state?.fieldErrors?.estimated_value && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.estimated_value}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Source</span>
            <input
              name="source"
              placeholder="Referral, Google, Facebook, Website…"
              className={f}
            />
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Next follow-up</span>
            <input name="next_follow_up_date" type="date" className={f} />
          </label>
        </div>

        <label className="block">
          <span className="block text-xs font-semibold text-ud-muted">Notes</span>
          <textarea
            name="notes"
            rows={3}
            placeholder="Add quote notes, next steps, or context…"
            className={f}
          />
        </label>

        <div className="flex justify-end pt-1">
          <SubmitButton>Create {profile.labels.leadSingular.toLowerCase()}</SubmitButton>
        </div>
      </form>
    </div>
  );
}
