import { registerSyncer } from "./registry";
import { registerRefresher } from "./token";
import { createImportSessionFromRows, filterFreshRows } from "@/lib/import-engine";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import type { IntegrationSyncer, SyncResult } from "./types";
import type { RawImportRow } from "@/lib/import-engine";

const JOBBER_GQL = "https://api.getjobber.com/api/graphql";

async function jobberQuery(accessToken: string, query: string): Promise<Record<string, unknown>> {
  const response = await fetch(JOBBER_GQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-JOBBER-GRAPHQL-VERSION": "2024-01-08",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) throw new Error(`Jobber API error: ${response.status}`);

  const json = (await response.json()) as { data?: Record<string, unknown>; errors?: unknown[] };
  if (json.errors?.length) throw new Error(`Jobber GraphQL errors: ${JSON.stringify(json.errors)}`);

  return json.data ?? {};
}

const JobberSyncer: IntegrationSyncer = {
  provider: "jobber",

  async sync(supabase, companyId, integration) {
    const accessToken = integration.access_token!;
    const result: SyncResult = { customersCreated: 0, customersUpdated: 0, recordsStaged: 0, sessionIds: [] };

    // Clients → relationships
    const clientData = await jobberQuery(accessToken, `{
      clients(first: 100) {
        nodes { id name emails { address } phones { number } billingAddress { street city province postalCode } }
      }
    }`);

    const clients = ((clientData.clients as Record<string, unknown>)?.nodes ?? []) as Record<string, unknown>[];
    if (clients.length > 0) {
      const allRows = clients.map((c) => ({
        external_id: String(c.id ?? ""),
        name: String(c.name ?? ""),
        email: String(((c.emails as Record<string, unknown>[])?.[0]?.address) ?? ""),
        phone: String(((c.phones as Record<string, unknown>[])?.[0]?.number) ?? ""),
        address: (() => {
          const addr = c.billingAddress as Record<string, string> | undefined;
          if (!addr) return "";
          return [addr.street, addr.city, addr.province, addr.postalCode].filter(Boolean).join(", ");
        })(),
      }));
      const rows = await filterFreshRows({ supabase, companyId, provider: "jobber", recordType: "relationships", rows: allRows, mapping: {} });
      if (rows.length > 0) {
        const { sessionId } = await createImportSessionFromRows({
          supabase, companyId, sourceType: "jobber", sourceName: "Jobber Clients",
          fileName: null, recordType: "relationships", rows, mapping: {},
        });
        result.sessionIds.push(sessionId);
      }
      result.recordsStaged += rows.length;
    }

    // Jobs → work
    const jobData = await jobberQuery(accessToken, `{
      jobs(first: 100) {
        nodes { id title jobStatus total startAt completedAt invoiceStatus }
      }
    }`);

    const jobs = ((jobData.jobs as Record<string, unknown>)?.nodes ?? []) as Record<string, unknown>[];
    if (jobs.length > 0) {
      const allRows = jobs.map((j) => ({
        external_id: String(j.id ?? ""),
        service_type: String(j.title ?? "Job"),
        status: String(j.jobStatus ?? "").toLowerCase(),
        job_value: String(j.total ?? "0"),
        start_date: j.startAt ? String(j.startAt).split("T")[0] : "",
        completed_date: j.completedAt ? String(j.completedAt).split("T")[0] : "",
        paid_status: j.invoiceStatus === "PAID" ? "paid" : "unpaid",
      }));
      const rows = await filterFreshRows({ supabase, companyId, provider: "jobber", recordType: "work", rows: allRows, mapping: {} });
      if (rows.length > 0) {
        const { sessionId } = await createImportSessionFromRows({
          supabase, companyId, sourceType: "jobber", sourceName: "Jobber Jobs",
          fileName: null, recordType: "work", rows, mapping: {},
        });
        result.sessionIds.push(sessionId);
      }
      result.recordsStaged += rows.length;
    }

    // Invoices → revenue
    const invoiceData = await jobberQuery(accessToken, `{
      invoices(first: 100) {
        nodes { id invoiceNum total invoiceStatus issuedDate }
      }
    }`);

    const invoices = ((invoiceData.invoices as Record<string, unknown>)?.nodes ?? []) as Record<string, unknown>[];
    if (invoices.length > 0) {
      const allRows = invoices.map((inv) => ({
        external_id: String(inv.id ?? ""),
        amount: String(inv.total ?? "0"),
        payment_status: inv.invoiceStatus === "PAID" ? "paid" : "unpaid",
        sale_date: inv.issuedDate ? String(inv.issuedDate).split("T")[0] : "",
        service_type: `Invoice #${inv.invoiceNum ?? ""}`,
        source: "jobber",
      }));
      const rows = await filterFreshRows({ supabase, companyId, provider: "jobber", recordType: "revenue", rows: allRows, mapping: {} });
      if (rows.length > 0) {
        const { sessionId } = await createImportSessionFromRows({
          supabase, companyId, sourceType: "jobber", sourceName: "Jobber Invoices",
          fileName: null, recordType: "revenue", rows, mapping: {},
        });
        result.sessionIds.push(sessionId);
      }
      result.recordsStaged += rows.length;
    }

    return result;
  },
};

registerSyncer(JobberSyncer);

registerRefresher("jobber", async (integration) => {
  const response = await fetch("https://api.getjobber.com/api/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.JOBBER_CLIENT_ID!,
      client_secret: process.env.JOBBER_CLIENT_SECRET!,
      refresh_token: integration.refresh_token!,
    }),
  });

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Jobber token refresh failed");

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
  };
});

// ---------------------------------------------------------------------------
// Legacy helpers — preserved for existing API routes that import these directly
// ---------------------------------------------------------------------------

type JobberIntegration = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  provider_account_name: string | null;
  metadata: Record<string, unknown> | null;
};

type JobberTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type JobberGraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

type JobberPageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

type JobberClient = {
  id: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  emails?: { address: string }[];
  phones?: { number: string; primary: boolean }[];
  billingAddress?: {
    street?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
  } | null;
  isCompany?: boolean;
};

type JobberJob = {
  id: string;
  title?: string | null;
  jobNumber?: number | null;
  jobStatus?: string | null;
  startAt?: string | null;
  completedAt?: string | null;
  total?: number | null;
  client?: { name: string } | null;
};

type JobberQuote = {
  id: string;
  title?: string | null;
  quoteNumber?: number | null;
  quoteStatus?: string | null;
  createdAt?: string | null;
  approvedAt?: string | null;
  total?: number | null;
  client?: { name: string } | null;
  message?: string | null;
};

type JobberInvoice = {
  id: string;
  invoiceNumber?: number | null;
  invoiceStatus?: string | null;
  issuedDate?: string | null;
  dueDate?: string | null;
  total?: number | null;
  client?: { name: string } | null;
  subject?: string | null;
};

const JOBBER_GRAPHQL = "https://api.getjobber.com/api/graphql";

export async function getJobberIntegration({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient<Database>;
  companyId: string;
}): Promise<JobberIntegration | null> {
  const { data, error } = await supabase
    .from("integrations")
    .select(
      "id, access_token, refresh_token, token_expires_at, provider_account_name, metadata",
    )
    .eq("company_id", companyId)
    .eq("provider", "jobber")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data as JobberIntegration | null;
}

async function refreshJobberAccessToken({
  supabase,
  integration,
}: {
  supabase: SupabaseClient<Database>;
  integration: JobberIntegration;
}): Promise<string> {
  if (!integration.refresh_token) {
    throw new Error("Jobber account is missing a refresh token. Reconnect Jobber.");
  }

  const clientId = process.env.JOBBER_CLIENT_ID;
  const clientSecret = process.env.JOBBER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing Jobber OAuth environment variables.");

  const response = await fetch("https://api.getjobber.com/api/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
    }),
  });

  const data = (await response.json()) as JobberTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Failed to refresh Jobber token.");
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

export async function getValidJobberAccessToken({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient<Database>;
  companyId: string;
}): Promise<string> {
  const integration = await getJobberIntegration({ supabase, companyId });

  if (!integration) throw new Error("Jobber is not connected.");

  const expiresAt = integration.token_expires_at
    ? new Date(integration.token_expires_at).getTime()
    : 0;

  const expiresSoon = !expiresAt || expiresAt < Date.now() + 60 * 1000;

  if (!integration.access_token || expiresSoon) {
    return refreshJobberAccessToken({ supabase, integration });
  }

  return integration.access_token;
}

async function jobberQueryTyped<T>(
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(JOBBER_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-JOBBER-GRAPHQL-VERSION": "2024-01-10",
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = (await response.json()) as JobberGraphQLResponse<T>;

  if (!response.ok || result.errors?.length) {
    throw new Error(result.errors?.[0]?.message || "Jobber GraphQL error.");
  }

  return result.data as T;
}

export async function fetchJobberClients(accessToken: string): Promise<RawImportRow[]> {
  const query = `
    query GetClients($cursor: String) {
      clients(first: 100, after: $cursor) {
        nodes {
          id
          name
          firstName
          lastName
          companyName
          isCompany
          emails { address }
          phones { number primary }
          billingAddress { street city province postalCode }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  type ClientsData = {
    clients: { nodes: JobberClient[]; pageInfo: JobberPageInfo };
  };

  const results: JobberClient[] = [];
  let cursor: string | null = null;

  while (true) {
    const data: ClientsData = await jobberQueryTyped<ClientsData>(accessToken, query, { cursor });
    results.push(...data.clients.nodes);
    if (!data.clients.pageInfo.hasNextPage) break;
    cursor = data.clients.pageInfo.endCursor;
  }

  return results.map((c) => ({
    external_id: c.id,
    name: c.name || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.companyName || "",
    email: c.emails?.[0]?.address || "",
    phone: c.phones?.find((p) => p.primary)?.number || c.phones?.[0]?.number || "",
    address: [
      c.billingAddress?.street,
      c.billingAddress?.city,
      c.billingAddress?.province,
      c.billingAddress?.postalCode,
    ]
      .filter(Boolean)
      .join(", "),
    customer_type: c.isCompany ? "business" : "individual",
  }));
}

export async function fetchJobberJobs(accessToken: string): Promise<RawImportRow[]> {
  const query = `
    query GetJobs($cursor: String) {
      jobs(first: 100, after: $cursor) {
        nodes {
          id
          title
          jobNumber
          jobStatus
          startAt
          completedAt
          total
          client { name }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  type JobsData = {
    jobs: { nodes: JobberJob[]; pageInfo: JobberPageInfo };
  };

  const results: JobberJob[] = [];
  let cursor: string | null = null;

  while (true) {
    const data: JobsData = await jobberQueryTyped<JobsData>(accessToken, query, { cursor });
    results.push(...data.jobs.nodes);
    if (!data.jobs.pageInfo.hasNextPage) break;
    cursor = data.jobs.pageInfo.endCursor;
  }

  return results.map((j) => ({
    external_id: j.id,
    service_type: j.title || `Job #${j.jobNumber || j.id}`,
    status: mapJobberJobStatus(j.jobStatus),
    job_value: j.total != null ? String(j.total) : "",
    start_date: j.startAt ? j.startAt.split("T")[0] : "",
    completed_date: j.completedAt ? j.completedAt.split("T")[0] : "",
    paid_status: "Unpaid",
    notes: j.client?.name || "",
  }));
}

export async function fetchJobberQuotes(accessToken: string): Promise<RawImportRow[]> {
  const query = `
    query GetQuotes($cursor: String) {
      quotes(first: 100, after: $cursor) {
        nodes {
          id
          title
          quoteNumber
          quoteStatus
          createdAt
          approvedAt
          total
          client { name }
          message
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  type QuotesData = {
    quotes: { nodes: JobberQuote[]; pageInfo: JobberPageInfo };
  };

  const results: JobberQuote[] = [];
  let cursor: string | null = null;

  while (true) {
    const data: QuotesData = await jobberQueryTyped<QuotesData>(accessToken, query, { cursor });
    results.push(...data.quotes.nodes);
    if (!data.quotes.pageInfo.hasNextPage) break;
    cursor = data.quotes.pageInfo.endCursor;
  }

  return results.map((q) => ({
    external_id: q.id,
    service_requested: q.title || `Quote #${q.quoteNumber || q.id}`,
    estimated_value: q.total != null ? String(q.total) : "",
    status: q.quoteStatus === "approved" ? "Won" : "New",
    next_follow_up_date: q.approvedAt ? q.approvedAt.split("T")[0] : "",
    notes: [q.message, q.client?.name].filter(Boolean).join(" — "),
    source: "jobber",
  }));
}

export async function fetchJobberInvoices(accessToken: string): Promise<RawImportRow[]> {
  const query = `
    query GetInvoices($cursor: String) {
      invoices(first: 100, after: $cursor) {
        nodes {
          id
          invoiceNumber
          invoiceStatus
          issuedDate
          dueDate
          total
          client { name }
          subject
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  type InvoicesData = {
    invoices: { nodes: JobberInvoice[]; pageInfo: JobberPageInfo };
  };

  const results: JobberInvoice[] = [];
  let cursor: string | null = null;

  while (true) {
    const data: InvoicesData = await jobberQueryTyped<InvoicesData>(accessToken, query, { cursor });
    results.push(...data.invoices.nodes);
    if (!data.invoices.pageInfo.hasNextPage) break;
    cursor = data.invoices.pageInfo.endCursor;
  }

  return results.map((inv) => ({
    external_id: inv.id,
    amount: inv.total != null ? String(inv.total) : "0",
    payment_status: inv.invoiceStatus === "paid" ? "Paid" : "Unpaid",
    sale_date: inv.issuedDate ? inv.issuedDate.split("T")[0] : "",
    service_type: inv.subject || `Invoice #${inv.invoiceNumber || inv.id}`,
    source: "jobber",
  }));
}

export async function exchangeJobberCode(
  code: string,
  redirectUri: string,
): Promise<JobberTokenResponse> {
  const clientId = process.env.JOBBER_CLIENT_ID;
  const clientSecret = process.env.JOBBER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing Jobber OAuth environment variables.");

  const response = await fetch("https://api.getjobber.com/api/oauth/token", {
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

  return (await response.json()) as JobberTokenResponse;
}

function mapJobberJobStatus(status: string | null | undefined): string {
  switch (status?.toLowerCase()) {
    case "active":
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "requires_invoicing":
      return "Completed";
    case "late":
      return "In Progress";
    case "today":
      return "Scheduled";
    default:
      return "Scheduled";
  }
}
