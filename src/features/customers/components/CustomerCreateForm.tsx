"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { createCustomerAction, type ActionState } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { normalizeEmail, normalizePhone } from "@/lib/imports/normalizer";
import type { DuplicateContactMatch } from "@/lib/crm/types";

const f = "mt-1.5 w-full rounded-[10px] border border-ud bg-ud-surface-sunk px-4 py-[11px] text-base text-ud-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ud-accent focus:ring-2 focus:ring-ud-accent/15 placeholder:text-ud-faint";

type Props = {
  profile: IndustryProfile;
};

export function CustomerCreateForm({ profile }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createCustomerAction,
    null,
  );

  // Phase 03 — flag a likely duplicate as phone/email are typed, without
  // blocking submission: some businesses genuinely share a phone line (e.g.
  // a shared home line), so this is a nudge with a choice, not a hard gate.
  // No merge tool exists yet that safely carries a contact's jobs/leads/
  // sales/notes over to another record (see /api/contacts/check-duplicate
  // and src/lib/crm/contacts.ts for the full reasoning), so the resolution
  // offered here is "go look at the existing one", not an automatic merge.
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [duplicate, setDuplicate] = useState<DuplicateContactMatch | null>(null);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  useEffect(() => {
    setDuplicateDismissed(false);
    // Don't fire the request until there's a complete-looking email or
    // phone number — avoids a network round trip (and a premature banner)
    // on every keystroke of a still-partial value.
    if (!normalizeEmail(email) && !normalizePhone(phone)) {
      setDuplicate(null);
      return;
    }
    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      if (email.trim()) params.set("email", email.trim());
      if (phone.trim()) params.set("phone", phone.trim());
      try {
        const res = await fetch(`/api/contacts/check-duplicate?${params}`);
        if (res.ok) setDuplicate((await res.json()) as DuplicateContactMatch | null);
      } catch {
        // Non-fatal — the check is a nicety, not a requirement.
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [phone, email]);

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

        {duplicate && !duplicateDismissed && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-ud-warning/30 bg-ud-warning/10 px-4 py-3 text-sm text-ud-ink">
            <p>
              This looks like <span className="font-semibold">{duplicate.name}</span> — an
              existing contact with the same {duplicate.matchedOn === "email" ? "email" : "phone number"}.
            </p>
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/customers/${duplicate.id}`}
                className="rounded-[8px] bg-ud-accent px-3 py-[6px] text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                View existing contact
              </Link>
              <button
                type="button"
                onClick={() => setDuplicateDismissed(true)}
                className="rounded-[8px] border border-ud px-3 py-[6px] text-xs font-semibold text-ud-muted transition-colors hover:border-ud-hard hover:text-ud-ink"
              >
                Create anyway
              </button>
            </div>
          </div>
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
