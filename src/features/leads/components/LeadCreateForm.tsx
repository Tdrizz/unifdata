"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { createLeadAction, type ActionState } from "../actions";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ContactCombobox } from "@/components/ui/ContactCombobox";

// The Kanban board's stage names (Lead/Quoted/In progress/Won/Lost) and this
// form's status options are two different vocabularies — clicking "Add" in
// the Quoted column should default here to a status that actually lands the
// new record back in that column, not silently default to "New" regardless.
const STAGE_TO_DEFAULT_STATUS: Record<string, string> = {
  Lead: "New",
  Quoted: "Estimate Sent",
  "In progress": "Follow Up",
  Won: "Won",
  Lost: "Lost",
};

const f = "mt-1.5 w-full rounded-[10px] border border-ud bg-ud-surface-sunk px-4 py-[11px] text-base text-ud-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ud-accent focus:ring-2 focus:ring-ud-accent/15 placeholder:text-ud-faint";

type Props = {
  profile: IndustryProfile;
  // Overrides the `?add=` URL param — used by callers (like the mobile
  // pipeline FAB) that open this form outside of a real navigation, where
  // relying on useSearchParams() picking up a just-replaced URL would race.
  initialStage?: string;
};

export function LeadCreateForm({ profile, initialStage }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createLeadAction,
    null,
  );
  const searchParams = useSearchParams();
  const requestedStage = initialStage ?? searchParams.get("add");
  const defaultStatus = (requestedStage && STAGE_TO_DEFAULT_STATUS[requestedStage]) || "New";

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
            <ContactCombobox name="customer_id" className={f} />
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Status</span>
            <select name="status" defaultValue={defaultStatus} className={f}>
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
              <p className="mt-1 text-xs text-ud-danger">{state.fieldErrors.service_requested}</p>
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
              <p className="mt-1 text-xs text-ud-danger">{state.fieldErrors.estimated_value}</p>
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
