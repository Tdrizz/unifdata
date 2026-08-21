// Transitional helper for the customers -> master_customers cutover.
//
// Many readers were written against the legacy `customers` column shape
// ({ id, name, phone, email, address, customer_type, created_at }). Rather than
// reshape each call site by hand, they now query `master_customers` (the single
// source of truth) and map each row through here to preserve that shape. The
// legacy `customers` table is being retired; nothing should query it.

export type MasterCustomerRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email?: string | null;
  primary_phone?: string | null;
  billing_address?: { line1?: string | null } | null;
  metadata?: { customer_type?: string | null; notes?: string | null } | null;
  created_at?: string | null;
};

export type LegacyCustomerShape = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  customer_type: string | null;
  notes: string | null;
  created_at: string | null;
};

/** Columns to select from master_customers to build the legacy shape. */
export const MASTER_LEGACY_SELECT =
  "id, first_name, last_name, primary_email, primary_phone, billing_address, metadata, created_at";

export function masterToLegacyShape(m: MasterCustomerRow): LegacyCustomerShape {
  const name = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
  return {
    id: m.id,
    name,
    phone: m.primary_phone ?? null,
    email: m.primary_email ?? null,
    address: m.billing_address?.line1 ?? null,
    customer_type: m.metadata?.customer_type ?? null,
    notes: m.metadata?.notes ?? null,
    created_at: m.created_at ?? null,
  };
}

/** Split a single display name into first/last for writing master_customers. */
export function splitName(name: string): { first_name: string; last_name: string | null } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: null };
  return {
    first_name: parts[0],
    last_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}
