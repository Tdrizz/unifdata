"use client";

import { useActionState } from "react";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { createCustomerAction, type ActionState } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

const f = "mt-1.5 w-full rounded-[10px] border border-ud bg-ud-surface-sunk px-4 py-[11px] text-base text-ud-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ud-accent focus:ring-2 focus:ring-ud-accent/15 placeholder:text-ud-faint";

type Props = {
  profile: IndustryProfile;
};

export function CustomerCreateForm({ profile }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createCustomerAction,
    null,
  );

  return (
    <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
      <div className="px-5 py-4 border-b border-ud-soft">
        <p className="text-sm font-semibold text-ud-ink">
          Add {profile.labels.customerSingular.toLowerCase()}
        </p>
      </div>
      <form action={formAction} className="space-y-4 p-5">
        {state?.error && (
          <p className="rounded-[10px] bg-ud-danger-bg border border-ud-danger/20 px-4 py-3 text-sm text-ud-danger">
            {state.error}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block">
              <span className="block text-xs font-semibold text-ud-muted">
                Name <span className="text-ud-accent">*</span>
              </span>
              <input
                name="name"
                required
                placeholder="John Smith, ABC Flooring…"
                className={f}
              />
            </label>
            {state?.fieldErrors?.name && (
              <p className="mt-1 text-xs text-ud-danger">{state.fieldErrors.name}</p>
            )}
          </div>
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Type</span>
            <input
              name="customer_type"
              placeholder="Residential, commercial…"
              className={f}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Phone</span>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="808-555-1234"
              className={f}
            />
          </label>
          <div>
            <label className="block">
              <span className="block text-xs font-semibold text-ud-muted">Email</span>
              <input
                name="email"
                type="email"
                placeholder="customer@example.com"
                className={f}
              />
            </label>
            {state?.fieldErrors?.email && (
              <p className="mt-1 text-xs text-ud-danger">{state.fieldErrors.email}</p>
            )}
          </div>
        </div>

        <label className="block">
          <span className="block text-xs font-semibold text-ud-muted">Address</span>
          <input
            name="address"
            placeholder="Service address or city"
            className={f}
          />
        </label>

        <div className="flex justify-end pt-1">
          <SubmitButton>Save {profile.labels.customerSingular.toLowerCase()}</SubmitButton>
        </div>
      </form>
    </div>
  );
}
