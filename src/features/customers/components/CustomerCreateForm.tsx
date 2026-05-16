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
    <details className="group rounded-[14px] border border-ud bg-ud-surface shadow-ud">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-ud-ink">
            Add {profile.labels.customerSingular.toLowerCase()} or business
          </p>
          <p className="mt-1 text-sm text-ud-muted">
            Add a record manually without leaving the {profile.labels.customerPlural} page.
          </p>
        </div>

        <span className="rounded-[8px] border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted group-open:hidden">
          Open
        </span>

        <span className="hidden rounded-[8px] border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted group-open:inline-flex">
          Close
        </span>
      </summary>

      <form action={formAction} className="space-y-4 border-t border-ud p-5">
        {state?.error && (
          <p className="rounded-[10px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-ud-muted">
              Name
              <input
                name="name"
                required
                placeholder="John Smith, ABC Flooring, Ocean View Home..."
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
              placeholder="Customer, lead, residential, commercial..."
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
            placeholder="Service address, city, or area"
            className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent"
          />
        </label>

        <label className="block text-sm font-medium text-ud-muted">
          Notes
          <textarea
            name="notes"
            rows={3}
            placeholder="Preferences, project details, or follow-up context..."
            className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/40 focus:border-ud-accent"
          />
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-[10px] bg-ud-accent px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Add {profile.labels.customerSingular.toLowerCase()}
          </button>
        </div>
      </form>
    </details>
  );
}
