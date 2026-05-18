"use client";

import { useActionState } from "react";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { createCustomerAction, type ActionState } from "../actions";

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
          <div>
            <label className="text-sm font-medium text-ud-muted">
              Name *
              <input
                name="name"
                required
                placeholder="John Smith, ABC Flooring…"
                className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent"
              />
            </label>
            {state?.fieldErrors?.name && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name}</p>
            )}
          </div>
          <label className="text-sm font-medium text-ud-muted">
            Type
            <input
              name="customer_type"
              placeholder="Residential, commercial…"
              className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-ud-muted">
            Phone
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="808-555-1234"
              className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent"
            />
          </label>
          <div>
            <label className="text-sm font-medium text-ud-muted">
              Email
              <input
                name="email"
                type="email"
                placeholder="customer@example.com"
                className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent"
              />
            </label>
            {state?.fieldErrors?.email && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email}</p>
            )}
          </div>
        </div>

        <label className="block text-sm font-medium text-ud-muted">
          Address
          <input
            name="address"
            placeholder="Service address or city"
            className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent"
          />
        </label>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="rounded-[10px] bg-ud-accent px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity active:scale-[0.96]"
          >
            Save {profile.labels.customerSingular.toLowerCase()}
          </button>
        </div>
      </form>
    </div>
  );
}
