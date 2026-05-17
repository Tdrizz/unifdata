import { registerSyncer } from "./registry";
import { createImportSessionFromRows, filterFreshRows } from "@/lib/import-engine";
import type { IntegrationSyncer, SyncResult } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawImportRow } from "@/lib/import-engine";

type StripeIntegration = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  provider_account_name: string | null;
  metadata: Record<string, unknown> | null;
};

type StripeTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  stripe_publishable_key?: string;
  stripe_user_id?: string;
  scope?: string;
  livemode?: boolean;
  error?: string;
  error_description?: string;
};

type StripeCustomer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
  metadata?: Record<string, string>;
};

type StripeCharge = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description: string | null;
  customer: string | null;
  billing_details?: {
    name?: string | null;
    email?: string | null;
  };
};

type StripeListResponse<T> = {
  data?: T[];
  has_more?: boolean;
  error?: { message?: string };
};

export async function getStripeIntegration({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient;
  companyId: string;
}): Promise<StripeIntegration | null> {
  const { data, error } = await supabase
    .from("integrations")
    .select(
      "id, access_token, refresh_token, token_expires_at, provider_account_name, metadata",
    )
    .eq("company_id", companyId)
    .eq("provider", "stripe")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data as StripeIntegration | null;
}

export async function refreshStripeAccessToken({
  supabase,
  integration,
}: {
  supabase: SupabaseClient;
  integration: StripeIntegration;
}): Promise<string> {
  if (!integration.refresh_token) {
    throw new Error("Stripe account is missing a refresh token. Reconnect Stripe.");
  }

  const clientSecret = process.env.STRIPE_CLIENT_SECRET;
  if (!clientSecret) throw new Error("Missing STRIPE_CLIENT_SECRET.");

  const response = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: integration.refresh_token,
      client_secret: clientSecret,
    }),
  });

  const data = (await response.json()) as StripeTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Failed to refresh Stripe token.");
  }

  await supabase
    .from("integrations")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token || integration.refresh_token,
      metadata: {
        ...(integration.metadata || {}),
        refreshed_at: new Date().toISOString(),
      },
    })
    .eq("id", integration.id);

  return data.access_token;
}

export async function getValidStripeAccessToken({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient;
  companyId: string;
}): Promise<string> {
  const integration = await getStripeIntegration({ supabase, companyId });

  if (!integration) throw new Error("Stripe is not connected.");
  if (!integration.access_token) {
    return refreshStripeAccessToken({ supabase, integration });
  }

  return integration.access_token;
}

async function fetchAllPages<T>(
  url: string,
  accessToken: string,
): Promise<T[]> {
  const results: T[] = [];
  let startingAfter: string | null = null;

  while (true) {
    const pageUrl = new URL(url);
    pageUrl.searchParams.set("limit", "100");
    if (startingAfter) pageUrl.searchParams.set("starting_after", startingAfter);

    const response = await fetch(pageUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = (await response.json()) as StripeListResponse<T & { id: string }>;

    if (!response.ok) {
      throw new Error(data.error?.message || "Stripe API error.");
    }

    const items = data.data || [];
    results.push(...(items as T[]));

    if (!data.has_more || items.length === 0) break;
    startingAfter = (items[items.length - 1] as { id: string }).id;
  }

  return results;
}

export async function fetchStripeCustomers(accessToken: string): Promise<RawImportRow[]> {
  const customers = await fetchAllPages<StripeCustomer>(
    "https://api.stripe.com/v1/customers",
    accessToken,
  );

  return customers.map((c) => ({
    external_id: c.id,
    name: c.name || "",
    email: c.email || "",
    phone: c.phone || "",
    address: [c.address?.line1, c.address?.city, c.address?.state, c.address?.postal_code]
      .filter(Boolean)
      .join(", "),
    customer_type: "customer",
  }));
}

export async function fetchStripeCharges(accessToken: string): Promise<RawImportRow[]> {
  const charges = await fetchAllPages<StripeCharge>(
    "https://api.stripe.com/v1/charges",
    accessToken,
  );

  return charges
    .filter((c) => c.status === "succeeded")
    .map((c) => ({
      external_id: c.id,
      amount: (c.amount / 100).toFixed(2),
      payment_status: "Paid",
      sale_date: new Date(c.created * 1000).toISOString().split("T")[0],
      service_type: c.description || "",
      source: "stripe",
    }));
}

export async function exchangeStripeCode(code: string): Promise<StripeTokenResponse> {
  const clientSecret = process.env.STRIPE_CLIENT_SECRET;
  if (!clientSecret) throw new Error("Missing STRIPE_CLIENT_SECRET.");

  const response = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_secret: clientSecret,
    }),
  });

  return (await response.json()) as StripeTokenResponse;
}

// ── IntegrationSyncer implementation ──────────────────────────────────────────

const STRIPE_BASE = "https://api.stripe.com/v1";

async function stripeGet(secretKey: string, path: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${STRIPE_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  if (!response.ok) throw new Error(`Stripe API error (${response.status}): ${path}`);

  return response.json() as Promise<Record<string, unknown>>;
}

const StripeSyncer: IntegrationSyncer = {
  provider: "stripe",

  async sync(supabase, companyId, integration) {
    // Stripe uses a secret key stored as access_token — no OAuth refresh
    const secretKey = integration.access_token!;
    const result: SyncResult = { customersCreated: 0, customersUpdated: 0, recordsStaged: 0, sessionIds: [] };

    // Customers → relationships
    const customerData = await stripeGet(secretKey, "/customers?limit=100");
    const customers = (customerData.data ?? []) as Record<string, unknown>[];
    if (customers.length > 0) {
      const allRows = customers.map((c) => ({
        external_id: String(c.id ?? ""),
        name: String(c.name ?? c.email ?? "Stripe customer"),
        email: String(c.email ?? ""),
        phone: String(c.phone ?? ""),
        address: (() => {
          const addr = c.address as Record<string, string> | undefined;
          if (!addr) return "";
          return [addr.line1, addr.city, addr.state, addr.postal_code].filter(Boolean).join(", ");
        })(),
      }));
      const rows = await filterFreshRows({ supabase, companyId, provider: "stripe", recordType: "relationships", rows: allRows, mapping: {} });
      if (rows.length > 0) {
        const { sessionId } = await createImportSessionFromRows({
          supabase, companyId, sourceType: "stripe", sourceName: "Stripe Customers",
          fileName: null, recordType: "relationships", rows, mapping: {},
        });
        result.sessionIds.push(sessionId);
      }
      result.recordsStaged += rows.length;
    }

    // Charges → revenue
    const chargeData = await stripeGet(secretKey, "/charges?limit=100");
    const charges = (chargeData.data ?? []) as Record<string, unknown>[];
    if (charges.length > 0) {
      const allRows = charges.map((ch) => ({
        external_id: String(ch.id ?? ""),
        amount: String(Number(ch.amount ?? 0) / 100),
        payment_status: ch.paid ? "paid" : "unpaid",
        sale_date: ch.created
          ? new Date(Number(ch.created) * 1000).toISOString().split("T")[0]
          : "",
        service_type: String(ch.description ?? "Stripe charge"),
        source: "stripe",
      }));
      const rows = await filterFreshRows({ supabase, companyId, provider: "stripe", recordType: "revenue", rows: allRows, mapping: {} });
      if (rows.length > 0) {
        const { sessionId } = await createImportSessionFromRows({
          supabase, companyId, sourceType: "stripe", sourceName: "Stripe Charges",
          fileName: null, recordType: "revenue", rows, mapping: {},
        });
        result.sessionIds.push(sessionId);
      }
      result.recordsStaged += rows.length;
    }

    return result;
  },
};

registerSyncer(StripeSyncer);
// No registerRefresher for Stripe — it uses a long-lived secret key
