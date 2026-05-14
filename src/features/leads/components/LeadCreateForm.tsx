"use client";

import { useActionState } from "react";
import { SectionCard } from "@/components/ui/SectionCard";
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
    <SectionCard
      title={`Add ${profile.labels.leadSingular.toLowerCase()}`}
      description={`Create a new ${profile.labels.leadSingular.toLowerCase()} manually and optionally link it to a ${profile.labels.customerSingular.toLowerCase()} or business.`}
    >
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold text-slate-950">Quick add</p>
            <p className="mt-1 text-sm text-slate-500">
              Add a quote, request, estimate, deal, or potential job.
            </p>
          </div>
          <span className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white group-open:hidden">
            Add {profile.labels.leadSingular.toLowerCase()}
          </span>
          <span className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 group-open:inline-flex">
            Close
          </span>
        </summary>

        <form action={formAction} className="border-t border-slate-100 p-5">
          {state?.error && (
            <p className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Link to person or business
              <select
                name="customer_id"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">No linked {profile.labels.customerSingular.toLowerCase()} yet</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name ||
                      customer.email ||
                      customer.phone ||
                      "Unnamed person"}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Status
              <select
                name="status"
                defaultValue="New"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
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

          <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
            <label className="text-sm font-medium text-slate-700">
              Opportunity name
              <input
                name="service_requested"
                required
                placeholder="Website redesign, flooring quote, monthly service plan..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
              {state?.fieldErrors?.service_requested && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.service_requested}</p>
              )}
            </label>

            <label className="text-sm font-medium text-slate-700">
              Estimated value
              <input
                name="estimated_value"
                type="number"
                step="0.01"
                min="0"
                placeholder="2500"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
              {state?.fieldErrors?.estimated_value && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.estimated_value}</p>
              )}
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Source
              <input
                name="source"
                placeholder="Referral, Google, Facebook, Website..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Next follow-up
              <input
                name="next_follow_up_date"
                type="date"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Notes
            <textarea
              name="notes"
              rows={3}
              placeholder="Add quote notes, next steps, or context..."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create {profile.labels.leadSingular.toLowerCase()}
            </button>
          </div>
        </form>
      </details>
    </SectionCard>
  );
}
