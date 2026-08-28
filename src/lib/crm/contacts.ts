import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail, normalizePhone } from "@/lib/imports/normalizer";
import { sanitizeSearchTerm } from "@/lib/search";
import type { DuplicateContactMatch } from "./types";

/**
 * Returns the contactId only if it belongs to the given company, otherwise null.
 *
 * The app's Supabase client runs with the service role (RLS bypassed), so a
 * client-supplied contact_id must be validated in application code before it is
 * written or used for activity logging — otherwise a crafted form submission
 * could attach a record to, or log activity against, another tenant's contact.
 */
export async function resolveOwnedContactId(
  supabase: SupabaseClient,
  companyId: string,
  contactId: string | null | undefined,
): Promise<string | null> {
  if (!contactId) return null;
  const { data } = await supabase
    .from("master_customers")
    .select("id")
    .eq("id", contactId)
    .eq("organization_id", companyId)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Point lookup for one already-linked contact's display info, org-scoped.
 * Used by edit forms to pre-fill ContactCombobox's default selection instead
 * of fetching every contact in the workspace (the old getCustomersFor*Select
 * functions all capped at 500 rows, so a linked contact past that cap could
 * silently disappear from an edit form's picker).
 */
export async function getContactForSelect(
  supabase: SupabaseClient,
  companyId: string,
  contactId: string | null | undefined,
): Promise<{ id: string; name: string; email: string | null; phone: string | null } | null> {
  if (!contactId) return null;
  const { data } = await supabase
    .from("master_customers")
    .select("id, first_name, last_name, primary_email, primary_phone")
    .eq("id", contactId)
    .eq("organization_id", companyId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    name: [data.first_name, data.last_name].filter(Boolean).join(" "),
    email: data.primary_email,
    phone: data.primary_phone,
  };
}

// ── Phase 03: create-time duplicate check ───────────────────────────────────
//
// This is deliberately shallow — an exact match on phone or email, nothing
// fuzzier. It exists to catch the common accidental case (someone re-adds a
// contact that's already there) with a dismissible banner, not to replace
// human judgment. The Data Hub's reconciliation pipeline (src/lib/data-keeper)
// does real fuzzy matching, but only for *incoming synced* data (webhooks,
// imports); this covers the manual "add contact" and quick-add-from-Pipeline
// paths, which that pipeline never sees.

/**
 * Builds the PostgREST `.or(...)` filter string for a duplicate lookup, or
 * null if neither input normalizes to a complete email/phone yet — lets
 * callers skip the query entirely while the user is still mid-keystroke.
 *
 * Phone numbers land in `master_customers` in two different shapes: the
 * manual "add contact" form (createCustomerAction) stores whatever
 * punctuation the user typed, while the import pipeline (normalizePhone in
 * lib/imports/normalizer) stores digits only. Matching on both the
 * normalized digits *and* the as-typed value catches a duplicate regardless
 * of which path created the existing record.
 */
export function buildDuplicateContactFilter(
  rawEmail: string | null | undefined,
  rawPhone: string | null | undefined,
): string | null {
  const email = normalizeEmail(rawEmail);
  const phone = normalizePhone(rawPhone);
  const trimmedRawPhone = (rawPhone ?? "").trim();

  const filters: string[] = [];
  if (email) filters.push(`primary_email.ilike.${sanitizeSearchTerm(email)}`);
  if (phone) {
    filters.push(`primary_phone.eq.${sanitizeSearchTerm(phone)}`);
    if (trimmedRawPhone && trimmedRawPhone !== phone) {
      filters.push(`primary_phone.eq.${sanitizeSearchTerm(trimmedRawPhone)}`);
    }
  }

  return filters.length ? filters.join(",") : null;
}

/** Which field a duplicate match was found on, so the banner can say "same email" vs "same phone number". */
export function matchedDuplicateField(
  match: { primary_email: string | null },
  rawEmail: string | null | undefined,
): "email" | "phone" {
  const email = normalizeEmail(rawEmail);
  if (email && match.primary_email && normalizeEmail(match.primary_email) === email) {
    return "email";
  }
  return "phone";
}

/**
 * Org-scoped duplicate lookup for the create-time banner. Returns the first
 * exact phone/email match, or null if there isn't one (or the inputs don't
 * yet look like a complete phone/email).
 */
export async function findDuplicateContact(
  supabase: SupabaseClient,
  companyId: string,
  rawEmail: string | null | undefined,
  rawPhone: string | null | undefined,
): Promise<DuplicateContactMatch | null> {
  const filter = buildDuplicateContactFilter(rawEmail, rawPhone);
  if (!filter) return null;

  const { data } = await supabase
    .from("master_customers")
    .select("id, first_name, last_name, primary_email, primary_phone")
    .eq("organization_id", companyId)
    .or(filter)
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    name: [data.first_name, data.last_name].filter(Boolean).join(" ") || "Unnamed person",
    email: data.primary_email,
    phone: data.primary_phone,
    matchedOn: matchedDuplicateField(data, rawEmail),
  };
}
