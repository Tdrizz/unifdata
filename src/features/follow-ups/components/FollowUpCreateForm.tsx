"use client";

import { useActionState } from "react";
import type { LeadRow } from "../types";
import { createFollowUpAction, type ActionState } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ContactCombobox } from "@/components/ui/ContactCombobox";

const f = "mt-1.5 w-full rounded-[10px] border border-ud bg-ud-surface-sunk px-4 py-[11px] text-base text-ud-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ud-accent focus:ring-2 focus:ring-ud-accent/15 placeholder:text-ud-faint";

type Props = {
  leads?: Pick<LeadRow, "id" | "service_requested" | "status">[];
};

export function FollowUpCreateForm({ leads = [] }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(createFollowUpAction, null);

  return (
    <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
      <div className="px-5 py-4 border-b border-ud-soft">
        <p className="text-sm font-semibold text-ud-ink">Add follow-up</p>
      </div>
      <form action={formAction} className="space-y-4 p-5">
        {state?.error && (
          <p className="rounded-[10px] border border-ud-danger/20 bg-ud-danger-bg px-4 py-3 text-sm font-semibold text-ud-danger">
            {state.error}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Link to person or business</span>
            <ContactCombobox name="contact_id" className={f} />
          </label>
          {leads.length > 0 && (
            <label className="block">
              <span className="block text-xs font-semibold text-ud-muted">Link to opportunity</span>
              <select name="lead_id" className={f}>
                <option value="">No linked opportunity yet</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.service_requested || "Untitled opportunity"}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div>
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">
              Follow-up action <span className="text-ud-accent">*</span>
            </span>
            <input
              name="message"
              required
              placeholder="Call customer, send quote, check payment, schedule job…"
              className={f}
            />
          </label>
          {state?.fieldErrors?.message && (
            <p className="mt-1 text-xs text-ud-danger">{state.fieldErrors.message}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Due date</span>
            <input name="due_date" type="date" className={f} />
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Status</span>
            <select name="status" defaultValue="Open" className={f}>
              <option value="Open">Open</option>
              <option value="Pending">Pending</option>
              <option value="Follow Up">Follow Up</option>
              <option value="Complete">Complete</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end pt-1">
          <SubmitButton>Create follow-up</SubmitButton>
        </div>
      </form>
    </div>
  );
}
