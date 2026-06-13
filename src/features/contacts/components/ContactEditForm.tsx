"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { updateContactAction, deleteContactAction, type ActionState } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

const f = "mt-1.5 w-full rounded-[10px] border border-ud bg-ud-surface-sunk px-4 py-[11px] text-base text-ud-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ud-accent focus:ring-2 focus:ring-ud-accent/15 placeholder:text-ud-faint";

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "inactive", label: "Inactive" },
  { value: "closed", label: "Closed" },
];

type Contact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  billing_address: { line1?: string } | null;
  relationship_status: string | null;
  metadata: { customer_type?: string; notes?: string } | null;
};

type Props = {
  contact: Contact;
  profile: IndustryProfile;
  errorParam?: string;
};

export function ContactEditForm({ contact, profile, errorParam }: Props) {
  const updateAction = updateContactAction.bind(null, contact.id);
  const [state, formAction] = useActionState<ActionState, FormData>(updateAction, null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const customerLabel = profile.labels.customerSingular.toLowerCase();

  return (
    <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
      <div className="px-5 py-4 border-b border-ud-soft flex items-center justify-between">
        <p className="text-sm font-semibold text-ud-ink">Edit {customerLabel}</p>
        <Link href={`/customers/${contact.id}`} className="text-[12px] text-ud-muted hover:text-ud-ink">
          Back to {customerLabel} →
        </Link>
      </div>
      <form action={formAction} className="space-y-4 p-5">
        {(state?.error || errorParam) && (
          <p className="rounded-[10px] bg-ud-danger-bg border border-ud-danger/20 px-4 py-3 text-sm text-ud-danger">
            {state?.error ?? errorParam}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block">
              <span className="block text-xs font-semibold text-ud-muted">
                Name <span className="text-ud-accent">*</span>
              </span>
              <input name="name" required defaultValue={name} className={f} />
            </label>
            {state?.fieldErrors?.name && (
              <p className="mt-1 text-xs text-ud-danger">{state.fieldErrors.name}</p>
            )}
          </div>
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Type</span>
            <input
              name="customer_type"
              defaultValue={contact.metadata?.customer_type ?? ""}
              placeholder="Residential, commercial…"
              className={f}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Phone</span>
            <input name="phone" type="tel" autoComplete="tel" defaultValue={contact.primary_phone ?? ""} className={f} />
          </label>
          <div>
            <label className="block">
              <span className="block text-xs font-semibold text-ud-muted">Email</span>
              <input name="email" type="email" defaultValue={contact.primary_email ?? ""} className={f} />
            </label>
            {state?.fieldErrors?.email && (
              <p className="mt-1 text-xs text-ud-danger">{state.fieldErrors.email}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Address</span>
            <input name="address" defaultValue={contact.billing_address?.line1 ?? ""} className={f} />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-ud-muted">Status</span>
            <select
              name="relationship_status"
              defaultValue={contact.relationship_status ?? "active"}
              className={f}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="block text-xs font-semibold text-ud-muted">Notes</span>
          <textarea name="notes" rows={3} defaultValue={contact.metadata?.notes ?? ""} className={`${f} resize-none`} />
        </label>

        <div className="flex items-center justify-between pt-1">
          {confirmDelete ? (
            <span className="flex items-center gap-2">
              <span className="text-[12px] text-ud-danger font-medium">Delete this {customerLabel}?</span>
              <button
                type="submit"
                formAction={deleteContactAction.bind(null, contact.id)}
                className="px-3 py-1.5 rounded-[8px] bg-red-600 text-white text-[12px] font-semibold hover:opacity-90"
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-[8px] border border-ud text-[12px] text-ud-muted hover:text-ud-ink"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-[12px] text-ud-danger hover:underline"
            >
              Delete {customerLabel}
            </button>
          )}
          <SubmitButton>Save changes</SubmitButton>
        </div>
      </form>
    </div>
  );
}
