import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ConflictSource = "quickbooks" | "jobber" | "hubspot";

export type MasterCustomerPayload = {
  organization_id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email?: string | null;
  primary_phone?: string | null;
  billing_address?: Record<string, string> | null;
  service_address?: Record<string, string> | null;
  quickbooks_customer_id?: string | null;
  jobber_client_id?: string | null;
  hubspot_contact_id?: string | null;
  metadata?: Record<string, unknown>;
  updated_at?: string;
};

type MasterCustomerRow = MasterCustomerPayload & {
  id: string;
  sync_tokens: Record<string, string>;
  data_health_score: number;
};

// ── Precedence rules ───────────────────────────────────────────────────────────
//
// Financial & billing fields  → QuickBooks wins
// Operational & service fields → Jobber wins
// Identity & contact fields   → most recently updated timestamp wins

const QB_FIELDS: (keyof MasterCustomerPayload)[] = [
  "billing_address",
];

const JOBBER_FIELDS: (keyof MasterCustomerPayload)[] = [
  "service_address",
];

const IDENTITY_FIELDS: (keyof MasterCustomerPayload)[] = [
  "first_name",
  "last_name",
  "primary_email",
  "primary_phone",
];

// ── Loop prevention ────────────────────────────────────────────────────────────

function generateSyncToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function isEchoWebhook(
  storedTokens: Record<string, string>,
  provider: ConflictSource,
  incomingToken: string | null | undefined,
): boolean {
  if (!incomingToken) return false;
  return storedTokens[provider] === incomingToken;
}

// ── Core merge logic ───────────────────────────────────────────────────────────

function mergeFields(
  existing: MasterCustomerRow,
  incoming: MasterCustomerPayload,
  source: ConflictSource,
): Partial<MasterCustomerPayload> {
  const merged: Partial<MasterCustomerPayload> = {};

  for (const field of QB_FIELDS) {
    if (source === "quickbooks" && incoming[field] !== undefined) {
      (merged as Record<string, unknown>)[field] = incoming[field];
    } else if (source !== "quickbooks" && existing[field] !== undefined) {
      // Non-QB sources cannot overwrite QB-owned billing fields.
    }
  }

  for (const field of JOBBER_FIELDS) {
    if (source === "jobber" && incoming[field] !== undefined) {
      (merged as Record<string, unknown>)[field] = incoming[field];
    } else if (source !== "jobber" && existing[field] !== undefined) {
      // Non-Jobber sources cannot overwrite Jobber-owned service fields.
    }
  }

  // Identity fields: latest updated_at wins.
  const incomingTs = incoming.updated_at ? new Date(incoming.updated_at).getTime() : 0;
  const existingTs = existing.updated_at ? new Date(existing.updated_at as string).getTime() : 0;

  if (incomingTs >= existingTs) {
    for (const field of IDENTITY_FIELDS) {
      if (incoming[field] !== undefined) {
        (merged as Record<string, unknown>)[field] = incoming[field];
      }
    }
  }

  return merged;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Upserts a customer record into master_customers using precedence-based merging.
 *
 * - Looks up an existing row by provider ID (quickbooks_customer_id etc.).
 * - On INSERT: writes the full payload and stamps a sync token.
 * - On UPDATE: applies precedence rules field-by-field, then stamps a new token.
 *
 * Returns the sync token written, so callers can attach it to the outbound
 * provider API call before it fires (preventing the echo webhook from re-entry).
 */
export async function upsertMasterCustomer({
  supabase,
  source,
  payload,
  providerCustomerId,
}: {
  supabase: SupabaseClient;
  source: ConflictSource;
  payload: MasterCustomerPayload;
  providerCustomerId: string;
}): Promise<{ id: string; syncToken: string; wasCreated: boolean }> {
  const providerIdField =
    source === "quickbooks"
      ? "quickbooks_customer_id"
      : source === "jobber"
        ? "jobber_client_id"
        : "hubspot_contact_id";

  // Look up existing record.
  const { data: existing } = await supabase
    .from("master_customers")
    .select("*")
    .eq("organization_id", payload.organization_id)
    .eq(providerIdField, providerCustomerId)
    .maybeSingle();

  const syncToken = generateSyncToken();

  if (!existing) {
    // INSERT — no existing record, write everything.
    const { data: created, error } = await supabase
      .from("master_customers")
      .insert({
        ...payload,
        [providerIdField]: providerCustomerId,
        sync_tokens: { [source]: syncToken },
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw new Error(`master_customers insert failed: ${error.message}`);

    return { id: created.id, syncToken, wasCreated: true };
  }

  // UPDATE — apply precedence rules.
  const existingRow = existing as MasterCustomerRow;
  const mergedFields = mergeFields(existingRow, payload, source);

  // Skip update if no fields actually changed
  const hasChanges = Object.entries(mergedFields).some(
    ([key, value]) => existingRow[key] !== value
  );

  if (!hasChanges) {
    return { id: existingRow.id, syncToken: generateSyncToken(), wasCreated: false };
  }

  const { error } = await supabase
    .from("master_customers")
    .update({
      ...mergedFields,
      sync_tokens: {
        ...(existingRow.sync_tokens ?? {}),
        [source]: syncToken,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingRow.id);

  if (error) throw new Error(`master_customers update failed: ${error.message}`);

  return { id: existingRow.id, syncToken, wasCreated: false };
}

/**
 * Call this at the top of every inbound webhook handler.
 * Returns true if the event should be dropped (it's an echo of our own outbound write).
 */
export async function checkAndDropEchoWebhook({
  supabase,
  organizationId,
  source,
  providerCustomerId,
  incomingToken,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  source: ConflictSource;
  providerCustomerId: string;
  incomingToken: string | null | undefined;
}): Promise<boolean> {
  if (!incomingToken) return false;

  const providerIdField =
    source === "quickbooks"
      ? "quickbooks_customer_id"
      : source === "jobber"
        ? "jobber_client_id"
        : "hubspot_contact_id";

  const { data } = await supabase
    .from("master_customers")
    .select("sync_tokens")
    .eq("organization_id", organizationId)
    .eq(providerIdField, providerCustomerId)
    .maybeSingle();

  if (!data) return false;

  const tokens = (data.sync_tokens ?? {}) as Record<string, string>;
  return isEchoWebhook(tokens, source, incomingToken);
}
