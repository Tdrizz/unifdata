import type { SupabaseClient } from "@supabase/supabase-js";
import { registerSyncer } from "./registry";
import { registerRefresher } from "./token";
import { createImportSessionFromRows, filterFreshRows, type RawImportRow } from "@/lib/import-engine";
import type { IntegrationSyncer, SyncResult } from "./types";

// ── QuickBooks API helpers ─────────────────────────────────────────────────────

type QBTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  x_refresh_token_expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type QBQueryResponse<T> = {
  QueryResponse?: Record<string, T[]>;
  Fault?: { Error?: { Message?: string }[] };
};

type QBCustomer = {
  Id: string;
  DisplayName?: string;
  GivenName?: string;
  FamilyName?: string;
  PrimaryEmailAddr?: { Address?: string };
  PrimaryPhone?: { FreeFormNumber?: string };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
  CompanyName?: string;
};

type QBInvoice = {
  Id: string;
  TotalAmt?: number;
  Balance?: number;
  TxnDate?: string;
  DueDate?: string;
  CustomerRef?: { name?: string; value?: string };
  DocNumber?: string;
};

type QBEstimate = {
  Id: string;
  TotalAmt?: number;
  TxnDate?: string;
  ExpirationDate?: string;
  CustomerRef?: { name?: string; value?: string };
  CustomerMemo?: { value?: string };
  DocNumber?: string;
  TxnStatus?: string;
};

function getQBBaseUrl(): string {
  return process.env.QUICKBOOKS_SANDBOX === "true"
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
}

async function qbQuery<T>(
  accessToken: string,
  realmId: string,
  query: string,
): Promise<T[]> {
  const url = `${getQBBaseUrl()}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const data = (await response.json()) as QBQueryResponse<T>;

  if (!response.ok || data.Fault) {
    const msg = data.Fault?.Error?.[0]?.Message ?? "QuickBooks API error.";
    throw new Error(msg);
  }

  const key = Object.keys(data.QueryResponse ?? {})[0];
  return (data.QueryResponse?.[key] ?? []) as T[];
}

// ── IntegrationSyncer implementation ──────────────────────────────────────────

const QuickBooksSyncer: IntegrationSyncer = {
  provider: "quickbooks",

  async sync(supabase, companyId, integration) {
    const accessToken = integration.access_token!;
    const metadata = integration.metadata as Record<string, unknown> | null;
    const realmId = metadata?.realm_id as string | undefined;

    if (!realmId) {
      throw new Error(
        "QuickBooks realm ID not found in integration metadata.",
      );
    }

    const result: SyncResult = {
      customersCreated: 0,
      customersUpdated: 0,
      recordsStaged: 0,
      sessionIds: [],
    };

    // ── Customers → relationships ────────────────────────────────────────────
    const customers = await qbQuery<QBCustomer>(
      accessToken,
      realmId,
      "SELECT * FROM Customer WHERE Active = true MAXRESULTS 1000",
    );

    if (customers.length > 0) {
      const mapping = {
        name: "name",
        email: "email",
        phone: "phone",
        address: "address",
        customer_type: "customer_type",
      };

      const allRows = customers.map((c) => ({
        external_id: c.Id,
        name:
          c.DisplayName ||
          `${c.GivenName ?? ""} ${c.FamilyName ?? ""}`.trim(),
        email: c.PrimaryEmailAddr?.Address ?? "",
        phone: c.PrimaryPhone?.FreeFormNumber ?? "",
        address: [
          c.BillAddr?.Line1,
          c.BillAddr?.City,
          c.BillAddr?.CountrySubDivisionCode,
          c.BillAddr?.PostalCode,
        ]
          .filter(Boolean)
          .join(", "),
        customer_type: c.CompanyName ? "business" : "individual",
      }));

      const rows = await filterFreshRows({ supabase, companyId, provider: "quickbooks", recordType: "relationships", rows: allRows, mapping });
      if (rows.length > 0) {
        const { sessionId } = await createImportSessionFromRows({
          supabase,
          companyId,
          recordType: "relationships",
          sourceType: "quickbooks",
          sourceName: "quickbooks-customers",
          rows,
          mapping,
        });
        result.sessionIds.push(sessionId);
      }
      result.recordsStaged += rows.length;
    }

    // ── Invoices → revenue ───────────────────────────────────────────────────
    const invoices = await qbQuery<QBInvoice>(
      accessToken,
      realmId,
      "SELECT * FROM Invoice MAXRESULTS 1000",
    );

    if (invoices.length > 0) {
      const mapping = {
        amount: "amount",
        payment_status: "payment_status",
        sale_date: "sale_date",
        service_type: "service_type",
        customer_name: "customer_name",
        source: "source",
      };

      const allRows = invoices.map((inv) => ({
        external_id: inv.Id,
        amount: String(inv.TotalAmt ?? 0),
        payment_status: (inv.Balance ?? 0) === 0 ? "Paid" : "Unpaid",
        sale_date: inv.TxnDate ?? "",
        service_type: `Invoice ${inv.DocNumber ?? inv.Id}`,
        customer_name: inv.CustomerRef?.name ?? "",
        source: "quickbooks",
      }));

      const rows = await filterFreshRows({ supabase, companyId, provider: "quickbooks", recordType: "revenue", rows: allRows, mapping });
      if (rows.length > 0) {
        const { sessionId } = await createImportSessionFromRows({
          supabase,
          companyId,
          recordType: "revenue",
          sourceType: "quickbooks",
          sourceName: "quickbooks-invoices",
          rows,
          mapping,
        });
        result.sessionIds.push(sessionId);
      }
      result.recordsStaged += rows.length;
    }

    // ── Estimates → opportunities ────────────────────────────────────────────
    const estimates = await qbQuery<QBEstimate>(
      accessToken,
      realmId,
      "SELECT * FROM Estimate MAXRESULTS 1000",
    );

    if (estimates.length > 0) {
      const mapping = {
        service_requested: "service_requested",
        estimated_value: "estimated_value",
        status: "status",
        customer_name: "customer_name",
        next_follow_up_date: "next_follow_up_date",
        source: "source",
      };

      const allRows = estimates.map((est) => ({
        external_id: est.Id,
        service_requested:
          est.CustomerMemo?.value ??
          `Estimate ${est.DocNumber ?? est.Id}`,
        estimated_value: String(est.TotalAmt ?? 0),
        status: est.TxnStatus?.toLowerCase() ?? "new",
        customer_name: est.CustomerRef?.name ?? "",
        next_follow_up_date: est.ExpirationDate ?? "",
        source: "quickbooks",
      }));

      const rows = await filterFreshRows({ supabase, companyId, provider: "quickbooks", recordType: "opportunities", rows: allRows, mapping });
      if (rows.length > 0) {
        const { sessionId } = await createImportSessionFromRows({
          supabase,
          companyId,
          recordType: "opportunities",
          sourceType: "quickbooks",
          sourceName: "quickbooks-estimates",
          rows,
          mapping,
        });
        result.sessionIds.push(sessionId);
      }
      result.recordsStaged += rows.length;
    }

    return result;
  },
};

registerSyncer(QuickBooksSyncer);

// ── QuickBooks OAuth2 token refresh ───────────────────────────────────────────

registerRefresher("quickbooks", async (integration) => {
  if (!integration.refresh_token) {
    throw new Error(
      "QuickBooks account is missing a refresh token. Reconnect QuickBooks.",
    );
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing QuickBooks OAuth environment variables.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(
    "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: integration.refresh_token,
      }),
    },
  );

  const data = (await response.json()) as QBTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ??
        data.error ??
        "Failed to refresh QuickBooks token.",
    );
  }

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
  };
});

// ── Legacy-compatible exports (used by cron and older sync routes) ─────────────

type QBIntegration = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  provider_account_name: string | null;
  metadata: Record<string, unknown> | null;
};

async function getQBIntegrationRecord({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient;
  companyId: string;
}): Promise<QBIntegration | null> {
  const { data, error } = await supabase
    .from("integrations")
    .select(
      "id, access_token, refresh_token, token_expires_at, provider_account_name, metadata",
    )
    .eq("company_id", companyId)
    .eq("provider", "quickbooks")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data as QBIntegration | null;
}

async function refreshQBAccessTokenLegacy({
  supabase,
  integration,
}: {
  supabase: SupabaseClient;
  integration: QBIntegration;
}): Promise<string> {
  if (!integration.refresh_token) {
    throw new Error("QuickBooks account is missing a refresh token. Reconnect QuickBooks.");
  }

  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing QuickBooks OAuth environment variables.");

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: integration.refresh_token,
    }),
  });

  const data = (await response.json()) as QBTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Failed to refresh QuickBooks token.");
  }

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;

  await supabase
    .from("integrations")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token || integration.refresh_token,
      token_expires_at: expiresAt,
      metadata: {
        ...(integration.metadata || {}),
        refreshed_at: new Date().toISOString(),
      },
    })
    .eq("id", integration.id);

  return data.access_token;
}

export async function getValidQBAccessToken({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient;
  companyId: string;
}): Promise<string> {
  const integration = await getQBIntegrationRecord({ supabase, companyId });

  if (!integration) throw new Error("QuickBooks is not connected.");

  const expiresAt = integration.token_expires_at
    ? new Date(integration.token_expires_at).getTime()
    : 0;

  const expiresSoon = !expiresAt || expiresAt < Date.now() + 60 * 1000;

  if (!integration.access_token || expiresSoon) {
    return refreshQBAccessTokenLegacy({ supabase, integration });
  }

  return integration.access_token;
}

export async function getQBRealmIdFromIntegration({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient;
  companyId: string;
}): Promise<string> {
  const integration = await getQBIntegrationRecord({ supabase, companyId });

  if (!integration) throw new Error("QuickBooks is not connected.");

  const meta = integration.metadata ?? {};
  return String(meta.realm_id ?? "");
}

export async function fetchQBCustomers(
  accessToken: string,
  realmId: string,
): Promise<RawImportRow[]> {
  const customers = await qbQuery<QBCustomer>(
    accessToken,
    realmId,
    "SELECT * FROM Customer WHERE Active = true MAXRESULTS 1000",
  );

  return customers.map((c) => ({
    external_id: c.Id,
    name:
      c.DisplayName ||
      `${c.GivenName ?? ""} ${c.FamilyName ?? ""}`.trim(),
    email: c.PrimaryEmailAddr?.Address ?? "",
    phone: c.PrimaryPhone?.FreeFormNumber ?? "",
    address: [
      c.BillAddr?.Line1,
      c.BillAddr?.City,
      c.BillAddr?.CountrySubDivisionCode,
      c.BillAddr?.PostalCode,
    ]
      .filter(Boolean)
      .join(", "),
    customer_type: c.CompanyName ? "business" : "individual",
  }));
}

export async function fetchQBInvoices(
  accessToken: string,
  realmId: string,
): Promise<RawImportRow[]> {
  const invoices = await qbQuery<QBInvoice>(
    accessToken,
    realmId,
    "SELECT * FROM Invoice MAXRESULTS 1000",
  );

  return invoices.map((inv) => ({
    external_id: inv.Id,
    amount: String(inv.TotalAmt ?? 0),
    payment_status: (inv.Balance ?? 0) === 0 ? "Paid" : "Unpaid",
    sale_date: inv.TxnDate ?? "",
    service_type: `Invoice ${inv.DocNumber ?? inv.Id}`,
    customer_name: inv.CustomerRef?.name ?? "",
    source: "quickbooks",
  }));
}

export async function fetchQBEstimates(
  accessToken: string,
  realmId: string,
): Promise<RawImportRow[]> {
  const estimates = await qbQuery<QBEstimate>(
    accessToken,
    realmId,
    "SELECT * FROM Estimate MAXRESULTS 1000",
  );

  return estimates.map((est) => ({
    external_id: est.Id,
    service_requested:
      est.CustomerMemo?.value ?? `Estimate ${est.DocNumber ?? est.Id}`,
    estimated_value: String(est.TotalAmt ?? 0),
    status: est.TxnStatus?.toLowerCase() ?? "new",
    customer_name: est.CustomerRef?.name ?? "",
    next_follow_up_date: est.ExpirationDate ?? "",
    source: "quickbooks",
  }));
}
