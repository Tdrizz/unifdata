import { registerSyncer } from "./registry";
import { registerRefresher } from "./token";
import { createImportSessionFromRows } from "@/lib/import-engine";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawImportRow } from "@/lib/import-engine";
import type { IntegrationSyncer, SyncResult } from "./types";

const SQUARE_BASE = "https://connect.squareup.com/v2";

async function squareGet(accessToken: string, path: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${SQUARE_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    },
  });

  if (!response.ok) throw new Error(`Square API error (${response.status}): ${path}`);

  return response.json() as Promise<Record<string, unknown>>;
}

const SquareSyncer: IntegrationSyncer = {
  provider: "square",

  async sync(supabase, companyId, integration) {
    const accessToken = integration.access_token!;
    const result: SyncResult = { customersCreated: 0, customersUpdated: 0, recordsStaged: 0, sessionIds: [] };

    // Customers → relationships
    const customerData = await squareGet(accessToken, "/customers?limit=100");
    const customers = (customerData.customers ?? []) as Record<string, unknown>[];
    if (customers.length > 0) {
      const rows = customers.map((c) => {
        const addr = c.address as Record<string, string> | undefined;
        return {
          name: [c.given_name, c.family_name].filter(Boolean).join(" ") || String(c.company_name ?? "Customer"),
          email: String(c.email_address ?? ""),
          phone: String(c.phone_number ?? ""),
          address: addr ? [addr.address_line_1, addr.locality, addr.administrative_district_level_1, addr.postal_code].filter(Boolean).join(", ") : "",
        };
      });
      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "square", sourceName: "Square Customers",
        fileName: null, recordType: "relationships", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    // Payments → revenue
    const paymentData = await squareGet(accessToken, "/payments?limit=100");
    const payments = (paymentData.payments ?? []) as Record<string, unknown>[];
    if (payments.length > 0) {
      const rows = payments.map((p) => {
        const money = p.amount_money as Record<string, number> | undefined;
        const amountCents = money?.amount ?? 0;
        const createdAt = String(p.created_at ?? "");
        return {
          amount: String(amountCents / 100),
          payment_status: p.status === "COMPLETED" ? "paid" : "unpaid",
          sale_date: createdAt ? createdAt.split("T")[0] : "",
          service_type: "Square payment",
          source: "square",
        };
      });
      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "square", sourceName: "Square Payments",
        fileName: null, recordType: "revenue", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    return result;
  },
};

registerSyncer(SquareSyncer);

registerRefresher("square", async (integration) => {
  const response = await fetch("https://connect.squareup.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Square-Version": "2024-01-18" },
    body: JSON.stringify({
      client_id: process.env.SQUARE_CLIENT_ID,
      client_secret: process.env.SQUARE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: integration.refresh_token,
    }),
  });

  const data = (await response.json()) as { access_token?: string; expires_at?: string };
  if (!data.access_token) throw new Error("Square token refresh failed");

  return { accessToken: data.access_token, expiresAt: data.expires_at ?? null };
});

// ---------------------------------------------------------------------------
// Legacy utility exports — used by existing API routes and callback handlers.
// These remain to preserve the existing API surface while the codebase migrates
// to the IntegrationSyncer pattern above.
// ---------------------------------------------------------------------------

type SquareIntegration = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  provider_account_name: string | null;
  metadata: Record<string, unknown> | null;
};

type SquareTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  token_type?: string;
  merchant_id?: string;
  errors?: { detail?: string }[];
};

type SquareCustomer = {
  id: string;
  given_name?: string;
  family_name?: string;
  company_name?: string;
  email_address?: string;
  phone_number?: string;
  address?: {
    address_line_1?: string;
    locality?: string;
    administrative_district_level_1?: string;
    postal_code?: string;
  };
};

type SquarePayment = {
  id: string;
  amount_money?: { amount?: number; currency?: string };
  status?: string;
  created_at?: string;
  note?: string;
  source_type?: string;
};

type SquareListResponse<T> = {
  customers?: T[];
  payments?: T[];
  cursor?: string;
  errors?: { detail?: string }[];
};

export async function getSquareIntegration({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient;
  companyId: string;
}): Promise<SquareIntegration | null> {
  const { data, error } = await supabase
    .from("integrations")
    .select(
      "id, access_token, refresh_token, token_expires_at, provider_account_name, metadata",
    )
    .eq("company_id", companyId)
    .eq("provider", "square")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data as SquareIntegration | null;
}

async function refreshSquareAccessToken({
  supabase,
  integration,
}: {
  supabase: SupabaseClient;
  integration: SquareIntegration;
}): Promise<string> {
  if (!integration.refresh_token) {
    throw new Error("Square account is missing a refresh token. Reconnect Square.");
  }

  const clientId = process.env.SQUARE_CLIENT_ID;
  const clientSecret = process.env.SQUARE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing Square OAuth environment variables.");

  const response = await fetch("https://connect.squareup.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2024-01-17",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: integration.refresh_token,
    }),
  });

  const data = (await response.json()) as SquareTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.errors?.[0]?.detail || "Failed to refresh Square token.");
  }

  await supabase
    .from("integrations")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token || integration.refresh_token,
      token_expires_at: data.expires_at || null,
      metadata: {
        ...(integration.metadata || {}),
        refreshed_at: new Date().toISOString(),
      },
    })
    .eq("id", integration.id);

  return data.access_token;
}

export async function getValidSquareAccessToken({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient;
  companyId: string;
}): Promise<string> {
  const integration = await getSquareIntegration({ supabase, companyId });

  if (!integration) throw new Error("Square is not connected.");

  const expiresAt = integration.token_expires_at
    ? new Date(integration.token_expires_at).getTime()
    : 0;

  const expiresSoon = !expiresAt || expiresAt < Date.now() + 60 * 1000;

  if (!integration.access_token || expiresSoon) {
    return refreshSquareAccessToken({ supabase, integration });
  }

  return integration.access_token;
}

const SQUARE_LEGACY_BASE = "https://connect.squareup.com";

export async function fetchSquareCustomers(accessToken: string): Promise<RawImportRow[]> {
  const results: SquareCustomer[] = [];
  let cursor: string | undefined;

  while (true) {
    const url = new URL(`${SQUARE_LEGACY_BASE}/v2/customers`);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": "2024-01-17",
      },
    });

    const data = (await response.json()) as SquareListResponse<SquareCustomer>;

    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || "Square API error.");
    }

    results.push(...(data.customers || []));

    if (!data.cursor) break;
    cursor = data.cursor;
  }

  return results.map((c) => ({
    external_id: c.id,
    name: [c.given_name, c.family_name].filter(Boolean).join(" ") || c.company_name || "",
    email: c.email_address || "",
    phone: c.phone_number || "",
    address: [
      c.address?.address_line_1,
      c.address?.locality,
      c.address?.administrative_district_level_1,
      c.address?.postal_code,
    ]
      .filter(Boolean)
      .join(", "),
    customer_type: c.company_name ? "business" : "individual",
  }));
}

export async function fetchSquarePayments(accessToken: string): Promise<RawImportRow[]> {
  const results: SquarePayment[] = [];
  let cursor: string | undefined;

  while (true) {
    const url = new URL(`${SQUARE_LEGACY_BASE}/v2/payments`);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": "2024-01-17",
      },
    });

    const data = (await response.json()) as SquareListResponse<SquarePayment>;

    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || "Square API error.");
    }

    results.push(...(data.payments || []));

    if (!data.cursor) break;
    cursor = data.cursor;
  }

  return results
    .filter((p) => p.status === "COMPLETED")
    .map((p) => ({
      external_id: p.id,
      amount: p.amount_money?.amount
        ? (p.amount_money.amount / 100).toFixed(2)
        : "0",
      payment_status: "Paid",
      sale_date: p.created_at
        ? p.created_at.split("T")[0]
        : "",
      service_type: p.note || "",
      source: "square",
    }));
}

export async function exchangeSquareCode(
  code: string,
  redirectUri: string,
): Promise<SquareTokenResponse> {
  const clientId = process.env.SQUARE_CLIENT_ID;
  const clientSecret = process.env.SQUARE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing Square OAuth environment variables.");

  const response = await fetch("https://connect.squareup.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2024-01-17",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  return (await response.json()) as SquareTokenResponse;
}
