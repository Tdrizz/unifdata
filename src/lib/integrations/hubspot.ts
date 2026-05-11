import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawImportRow } from "@/lib/import-engine";

type HubSpotIntegration = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  provider_account_name: string | null;
  metadata: Record<string, unknown> | null;
};

type HubSpotTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
  message?: string;
};

type HubSpotContact = {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    lifecyclestage?: string;
  };
};

type HubSpotDeal = {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    closedate?: string;
    dealstage?: string;
    pipeline?: string;
    description?: string;
  };
};

type HubSpotListResponse<T> = {
  results?: T[];
  paging?: { next?: { after?: string } };
  message?: string;
};

export async function getHubSpotIntegration({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient;
  companyId: string;
}): Promise<HubSpotIntegration | null> {
  const { data, error } = await supabase
    .from("integrations")
    .select(
      "id, access_token, refresh_token, token_expires_at, provider_account_name, metadata",
    )
    .eq("company_id", companyId)
    .eq("provider", "hubspot")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data as HubSpotIntegration | null;
}

async function refreshHubSpotAccessToken({
  supabase,
  integration,
}: {
  supabase: SupabaseClient;
  integration: HubSpotIntegration;
}): Promise<string> {
  if (!integration.refresh_token) {
    throw new Error("HubSpot account is missing a refresh token. Reconnect HubSpot.");
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing HubSpot OAuth environment variables.");

  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
    }),
  });

  const data = (await response.json()) as HubSpotTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.message || data.error || "Failed to refresh HubSpot token.");
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

export async function getValidHubSpotAccessToken({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient;
  companyId: string;
}): Promise<string> {
  const integration = await getHubSpotIntegration({ supabase, companyId });

  if (!integration) throw new Error("HubSpot is not connected.");

  const expiresAt = integration.token_expires_at
    ? new Date(integration.token_expires_at).getTime()
    : 0;

  const expiresSoon = !expiresAt || expiresAt < Date.now() + 60 * 1000;

  if (!integration.access_token || expiresSoon) {
    return refreshHubSpotAccessToken({ supabase, integration });
  }

  return integration.access_token;
}

async function fetchAllHubSpotPages<T>(
  url: string,
  accessToken: string,
  properties: string[],
): Promise<T[]> {
  const results: T[] = [];
  let after: string | undefined;

  while (true) {
    const pageUrl = new URL(url);
    pageUrl.searchParams.set("limit", "100");
    pageUrl.searchParams.set("properties", properties.join(","));
    if (after) pageUrl.searchParams.set("after", after);

    const response = await fetch(pageUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = (await response.json()) as HubSpotListResponse<T>;

    if (!response.ok) {
      throw new Error(data.message || "HubSpot API error.");
    }

    results.push(...(data.results || []));

    const nextAfter = data.paging?.next?.after;
    if (!nextAfter) break;
    after = nextAfter;
  }

  return results;
}

export async function fetchHubSpotContacts(accessToken: string): Promise<RawImportRow[]> {
  const contacts = await fetchAllHubSpotPages<HubSpotContact>(
    "https://api.hubapi.com/crm/v3/objects/contacts",
    accessToken,
    ["firstname", "lastname", "email", "phone", "company", "address", "city", "state", "zip", "lifecyclestage"],
  );

  return contacts.map((c) => ({
    external_id: c.id,
    name: [c.properties.firstname, c.properties.lastname].filter(Boolean).join(" ") || c.properties.company || "",
    email: c.properties.email || "",
    phone: c.properties.phone || "",
    address: [c.properties.address, c.properties.city, c.properties.state, c.properties.zip]
      .filter(Boolean)
      .join(", "),
    customer_type: c.properties.lifecyclestage || "customer",
  }));
}

export async function fetchHubSpotDeals(accessToken: string): Promise<RawImportRow[]> {
  const deals = await fetchAllHubSpotPages<HubSpotDeal>(
    "https://api.hubapi.com/crm/v3/objects/deals",
    accessToken,
    ["dealname", "amount", "closedate", "dealstage", "pipeline", "description"],
  );

  return deals.map((d) => ({
    external_id: d.id,
    service_requested: d.properties.dealname || "",
    estimated_value: d.properties.amount || "",
    status: "New",
    next_follow_up_date: d.properties.closedate
      ? d.properties.closedate.split("T")[0]
      : "",
    notes: d.properties.description || "",
    source: "hubspot",
  }));
}

export async function exchangeHubSpotCode(
  code: string,
  redirectUri: string,
): Promise<HubSpotTokenResponse> {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing HubSpot OAuth environment variables.");

  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  return (await response.json()) as HubSpotTokenResponse;
}
