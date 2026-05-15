"use client";

import { useActionState } from "react";
import type { CustomerRow } from "../types";
import { createFollowUpAction, type ActionState } from "../actions";
import { SectionCard } from "@/components/ui/SectionCard";

type Props = {
  people: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
};

export function FollowUpCreateForm({ people }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(createFollowUpAction, null);

  return (
    <SectionCard
      title="Add manual follow-up"
      description="Create a reminder, callback, task, or next step and optionally connect it to a person."
    >
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold text-slate-950">Quick add</p>
            <p className="mt-1 text-sm text-slate-500">
              Opportunity follow-up dates appear automatically from the
              Opportunities page.
            </p>
          </div>

          <span className="rounded-2xl bg-[#1D2D3E] px-4 py-3 text-sm font-semibold text-white group-open:hidden">
            Add follow-up
          </span>

          <span className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 group-open:inline-flex">
            Close
          </span>
        </summary>

        <form
          action={formAction}
          className="border-t border-slate-100 p-5"
        >
          {state?.error && (
            <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {state.error}
            </p>
          )}

          <label className="block text-sm font-medium text-slate-700">
            Link to person or business
            <select
              name="customer_id"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">No linked person yet</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name ||
                    person.email ||
                    person.phone ||
                    "Unnamed person"}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Follow-up action
            <input
              name="message"
              required
              placeholder="Call customer, send quote, check payment, schedule job..."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
            />
            {state?.fieldErrors?.message && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.message}</p>
            )}
          </label>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Due date
              <input
                name="due_date"
                type="date"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Status
              <select
                name="status"
                defaultValue="Open"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="Open">Open</option>
                <option value="Pending">Pending</option>
                <option value="Follow Up">Follow Up</option>
                <option value="Complete">Complete</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="rounded-2xl bg-[#1D2D3E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a3f57]"
            >
              Create follow-up
            </button>
          </div>
        </form>
      </details>
    </SectionCard>
  );
}
