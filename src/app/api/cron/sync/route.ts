import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createImportSessionFromRows,
  commitImportSession,
  guessImportMapping,
  type ImportSourceType,
  type RawImportRow,
} from "@/lib/import-engine";
import { getValidQBAccessToken, getQBRealmIdFromIntegration, fetchQBCustomers, fetchQBInvoices, fetchQBEstimates } from "@/lib/integrations/quickbooks";
import { getValidSquareAccessToken, fetchSquareCustomers, fetchSquarePayments } from "@/lib/integrations/square";
import { getValidHubSpotAccessToken, fetchHubSpotContacts, fetchHubSpotDeals } from "@/lib/integrations/hubspot";
import { getValidJobberAccessToken, fetchJobberClients, fetchJobberJobs, fetchJobberQuotes, fetchJobberInvoices } from "@/lib/integrations/jobber";

type SyncJob = {
  recordType: "relationships" | "revenue" | "opportunities" | "work";
  fetcher: () => Promise<RawImportRow[]>;
  sourceType: ImportSourceType;
  sourceName: string;
};

async function getJobsForCompanyProvider(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  provider: string,
): Promise<SyncJob[]> {
  if (provider === "quickbooks") {
    const accessToken = await getValidQBAccessToken({ supabase, companyId });
    const realmId = await getQBRealmIdFromIntegration({ supabase, companyId });
    return [
      { recordType: "relationships", fetcher: () => fetchQBCustomers(accessToken, realmId), sourceType: "quickbooks", sourceName: realmId },
      { recordType: "revenue", fetcher: () => fetchQBInvoices(accessToken, realmId), sourceType: "quickbooks", sourceName: realmId },
      { recordType: "opportunities", fetcher: () => fetchQBEstimates(accessToken, realmId), sourceType: "quickbooks", sourceName: realmId },
    ];
  }

  if (provider === "square") {
    const accessToken = await getValidSquareAccessToken({ supabase, companyId });
    return [
      { recordType: "relationships", fetcher: () => fetchSquareCustomers(accessToken), sourceType: "square", sourceName: "square" },
      { recordType: "revenue", fetcher: () => fetchSquarePayments(accessToken), sourceType: "square", sourceName: "square" },
    ];
  }

  if (provider === "hubspot") {
    const accessToken = await getValidHubSpotAccessToken({ supabase, companyId });
    return [
      { recordType: "relationships", fetcher: () => fetchHubSpotContacts(accessToken), sourceType: "hubspot", sourceName: "hubspot" },
      { recordType: "opportunities", fetcher: () => fetchHubSpotDeals(accessToken), sourceType: "hubspot", sourceName: "hubspot" },
    ];
  }

  if (provider === "jobber") {
    const accessToken = await getValidJobberAccessToken({ supabase, companyId });
    return [
      { recordType: "relationships", fetcher: () => fetchJobberClients(accessToken), sourceType: "jobber", sourceName: "jobber" },
      { recordType: "work", fetcher: () => fetchJobberJobs(accessToken), sourceType: "jobber", sourceName: "jobber" },
      { recordType: "opportunities", fetcher: () => fetchJobberQuotes(accessToken), sourceType: "jobber", sourceName: "jobber" },
      { recordType: "revenue", fetcher: () => fetchJobberInvoices(accessToken), sourceType: "jobber", sourceName: "jobber" },
    ];
  }

  return [];
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const supabase = await createClient();

  // Fetch all active daily sync connections across all companies
  const { data: connections, error } = await supabase
    .from("sync_connections")
    .select("company_id, source_type")
    .eq("status", "active")
    .eq("sync_frequency", "daily")
    .in("source_type", ["quickbooks", "square", "hubspot", "jobber"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Deduplicate to one sync per company+provider
  const seen = new Set<string>();
  const uniquePairs: { companyId: string; provider: string }[] = [];

  for (const conn of connections || []) {
    const key = `${conn.company_id}:${conn.source_type}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePairs.push({ companyId: conn.company_id, provider: conn.source_type });
    }
  }

  const allResults: {
    companyId: string;
    provider: string;
    record_type: string;
    rows_synced: number;
    error: string | null;
  }[] = [];

  for (const { companyId, provider } of uniquePairs) {
    let jobs: SyncJob[] = [];

    try {
      jobs = await getJobsForCompanyProvider(supabase, companyId, provider);
    } catch (err) {
      allResults.push({
        companyId,
        provider,
        record_type: "all",
        rows_synced: 0,
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    for (const job of jobs) {
      try {
        const rows = await job.fetcher();
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        const mapping = guessImportMapping(headers, job.recordType);
        const { sessionId } = await createImportSessionFromRows({
          supabase,
          companyId,
          sourceType: job.sourceType,
          sourceName: job.sourceName,
          fileName: `${provider}_${job.recordType}`,
          recordType: job.recordType,
          rows,
          mapping,
        });
        await commitImportSession({ supabase, companyId, importSessionId: sessionId });
        allResults.push({ companyId, provider, record_type: job.recordType, rows_synced: rows.length, error: null });
      } catch (err) {
        allResults.push({
          companyId,
          provider,
          record_type: job.recordType,
          rows_synced: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Update last_sync_at for all connections belonging to this company+provider
    await supabase
      .from("sync_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("company_id", companyId)
      .eq("source_type", provider);
  }

  return NextResponse.json({ ok: true, synced: allResults.length, results: allResults });
}
