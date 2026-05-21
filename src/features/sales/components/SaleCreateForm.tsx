"use client";

import { useActionState } from "react";
import { createSaleAction, type ActionState } from "../actions";
import { getTodayString } from "@/lib/date-format";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { SubmitButton } from "@/components/ui/SubmitButton";

const f = "mt-1.5 w-full rounded-[10px] border border-ud bg-ud-surface-sunk px-4 py-[11px] text-base text-ud-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ud-accent focus:ring-2 focus:ring-ud-accent/15 placeholder:text-ud-faint";

type Props = {
  profile: IndustryProfile;
};

export function SaleCreateForm({ profile }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createSaleAction,
    null,
  );

  return (
    <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
      <div className="px-5 py-4 border-b border-ud-soft">
        <p className="text-sm font-semibold text-ud-ink">Add revenue</p>
      </div>
      <form action={formAction} className="space-y-4 p-5">
        {state?.error && (
          <p className="rounded-[10px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-[0.7fr_0.7fr_1fr]">
          <div>
            <label className="block">
              <span className="block text-xs font-semibold text-ud-muted">
                Amount <span className="text-ud-accent">*</span>
              </span>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="2500"
                className={f}
              />
            </label>
            {state?.fieldErrors?.amount && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.amount}</p>
            )}
          </div>
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Payment status</span>
            <select name="payment_status" defaultValue="Paid" className={f}>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Pending">Pending</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Revenue date</span>
            <input
              name="sale_date"
              type="date"
              defaultValue={getTodayString()}
              className={f}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Service or category</span>
            <input
              name="service_type"
              placeholder="Flooring install, website build, monthly service…"
              className={f}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Source</span>
            <input
              name="source"
              placeholder="Referral, Google, Website, Facebook…"
              className={f}
            />
          </label>
        </div>

        <div className="flex justify-end pt-1">
          <SubmitButton>Create {profile.labels.saleSingular.toLowerCase()}</SubmitButton>
        </div>
      </form>
    </div>
  );
}
