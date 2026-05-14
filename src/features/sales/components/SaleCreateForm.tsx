"use client";

import { useActionState } from "react";
import { SectionCard } from "@/components/ui/SectionCard";
import { createSaleAction, type ActionState } from "../actions";
import { getTodayString } from "@/lib/date-format";
import type { IndustryProfile } from "@/lib/industry-profiles";

type Props = {
  profile: IndustryProfile;
};

export function SaleCreateForm({ profile }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createSaleAction,
    null,
  );

  return (
    <SectionCard title="Add revenue" description="Create a payment or revenue record manually.">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold text-slate-950">Quick add</p>
            <p className="mt-1 text-sm text-slate-500">Add collected revenue, unpaid invoices, deposits, or partial payments.</p>
          </div>
          <span className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white group-open:hidden">Add revenue</span>
          <span className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 group-open:inline-flex">Close</span>
        </summary>

        <form action={formAction} className="border-t border-slate-100 p-5">
          {state?.error && (
            <p className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-[0.7fr_0.7fr_1fr]">
            <label className="text-sm font-medium text-slate-700">
              Amount
              <input name="amount" type="number" step="0.01" min="0" required placeholder="2500" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300" />
              {state?.fieldErrors?.amount && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.amount}</p>
              )}
            </label>
            <label className="text-sm font-medium text-slate-700">
              Payment status
              <select name="payment_status" defaultValue="Paid" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300">
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Revenue date
              <input name="sale_date" type="date" defaultValue={getTodayString()} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300" />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Service or category
              <input name="service_type" placeholder="Flooring install, website build, monthly service..." className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Source
              <input name="source" placeholder="Referral, Google, Website, Facebook..." className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300" />
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button type="submit" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Create {profile.labels.saleSingular.toLowerCase()}
            </button>
          </div>
        </form>
      </details>
    </SectionCard>
  );
}
