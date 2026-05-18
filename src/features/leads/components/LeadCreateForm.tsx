"use client";

import { useActionState } from "react";
import { createLeadAction, type ActionState } from "../actions";
import type { CustomerRow } from "../types";
import type { IndustryProfile } from "@/lib/industry-profiles";

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
        <p className="mt-0.5 text-xs text-ud-muted">
          Fill in the details below and hit save.
        </p>
      </div>
      <form action={formAction} className="space-y-4 p-5">
        {state?.error && (
          <p className="rounded-[10px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-ud-muted">
            Link to person or business
            <select
              name="customer_id"
              className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent"
            >
              <option value="">No linked {profile.labels.customerSingular.toLowerCase()} yet</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name || customer.email || customer.phone || "Unnamed person"}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-ud-muted">
            Status
            <select
              name="status"
              defaultValue="New"
              className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent"
            >
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Estimate Sent">Estimate Sent</option>
              <option value="Follow Up">Follow Up</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <div>
            <label className="text-sm font-medium text-ud-muted">
              Opportunity name
              <input
                name="service_requested"
                required
                placeholder="Website redesign, flooring quote, monthly service plan…"
                className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent"
              />
            </label>
            {state?.fieldErrors?.service_requested && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.service_requested}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-ud-muted">
              Estimated value
              <input
                name="estimated_value"
                type="number"
                step="0.01"
                min="0"
                placeholder="2500"
                className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent"
              />
            </label>
            {state?.fieldErrors?.estimated_value && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.estimated_value}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-ud-muted">
            Source
            <input
              name="source"
              placeholder="Referral, Google, Facebook, Website…"
              className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent"
            />
          </label>

          <label className="text-sm font-medium text-ud-muted">
            Next follow-up
            <input
              name="next_follow_up_date"
              type="date"
              className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent"
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-ud-muted">
          Notes
          <textarea
            name="notes"
            rows={3}
            placeholder="Add quote notes, next steps, or context…"
            className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent"
          />
        </label>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="rounded-[10px] bg-ud-accent px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity active:scale-[0.96]"
          >
            Create {profile.labels.leadSingular.toLowerCase()}
          </button>
        </div>
      </form>
    </div>
  );
}
