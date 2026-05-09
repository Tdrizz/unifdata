import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import {
  createImportSessionFromRows,
  commitImportSession,
  guessImportMapping,
  type ImportSourceType,
  type RawImportRow,
} from "@/lib/import-engine";
import { getValidStripeAccessToken, fetchStripeCustomers, fetchStripeCharges } from "@/lib/integrations/stripe";
import { getValidQBAccessToken, getQBRealmIdFromIntegration, fetchQBCustomers, fetchQBInvoices, fetchQBEstimates } from "@/lib/integrations/quickbooks";
import { getValidSquareAccessToken, fetchSquareCustomers, fetchSquarePayments } from "@/lib/integrations/square";
import { getValidHubSpotAccessToken, fetchHubSpotContacts, fetchHubSpotDeals } from "@/lib/integrations/hubspot";

const SUPPORTED_PROVIDERS = ["stripe", "quickbooks", "square", "hubspot"] as const;
type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

function isSupportedProvider(value: string): value is SupportedProvider {
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(value);
}

type SyncResult = {
  provider: string;
  record_type: string;
  rows_synced: number;
  session_id: string | null;
  error: string | null;
};

async function syncProvider(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  provider: SupportedProvider,
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  if (provider === "stripe") {
    const accessToken = await getValidStripeAccessToken({ supabase, companyId });

    const jobs: { recordType: "relationships" | "revenue"; fetcher: () => Promise<RawImportRow[]> }[] = [
      { recordType: "relationships", fetcher: () => fetchStripeCustomers(accessToken) },
      { recordType: "revenue", fetcher: () => fetchStripeCharges(accessToken) },
    ];

    for (const { recordType, fetcher } of jobs) {
      try {
        const rows = await fetcher();
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        const mapping = guessImportMapping(headers, recordType);
        const { sessionId } = await createImportSessionFromRows({
          supabase,
          companyId,
          sourceType: "stripe" as ImportSourceType,
          sourceName: "stripe",
          fileName: `stripe_${recordType}`,
          recordType,
          rows,
          mapping,
        });
        await commitImportSession({ supabase, companyId, importSessionId: sessionId });
        results.push({ provider, record_type: recordType, rows_synced: rows.length, session_id: sessionId, error: null });
      } catch (err) {
        results.push({ provider, record_type: recordType, rows_synced: 0, session_id: null, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  if (provider === "quickbooks") {
    const accessToken = await getValidQBAccessToken({ supabase, companyId });
    const realmId = await getQBRealmIdFromIntegration({ supabase, companyId });

    const jobs: { recordType: "relationships" | "revenue" | "opportunities"; fetcher: () => Promise<RawImportRow[]> }[] = [
      { recordType: "relationships", fetcher: () => fetchQBCustomers(accessToken, realmId) },
      { recordType: "revenue", fetcher: () => fetchQBInvoices(accessToken, realmId) },
      { recordType: "opportunities", fetcher: () => fetchQBEstimates(accessToken, realmId) },
    ];

    for (const { recordType, fetcher } of jobs) {
      try {
        const rows = await fetcher();
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        const mapping = guessImportMapping(headers, recordType);
        const { sessionId } = await createImportSessionFromRows({
          supabase,
          companyId,
          sourceType: "quickbooks" as ImportSourceType,
          sourceName: realmId,
          fileName: `quickbooks_${recordType}`,
          recordType,
          rows,
          mapping,
        });
        await commitImportSession({ supabase, companyId, importSessionId: sessionId });
        results.push({ provider, record_type: recordType, rows_synced: rows.length, session_id: sessionId, error: null });
      } catch (err) {
        results.push({ provider, record_type: recordType, rows_synced: 0, session_id: null, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  if (provider === "square") {
    const accessToken = await getValidSquareAccessToken({ supabase, companyId });

    const jobs: { recordType: "relationships" | "revenue"; fetcher: () => Promise<RawImportRow[]> }[] = [
      { recordType: "relationships", fetcher: () => fetchSquareCustomers(accessToken) },
      { recordType: "revenue", fetcher: () => fetchSquarePayments(accessToken) },
    ];

    for (const { recordType, fetcher } of jobs) {
      try {
        const rows = await fetcher();
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        const mapping = guessImportMapping(headers, recordType);
        const { sessionId } = await createImportSessionFromRows({
          supabase,
          companyId,
          sourceType: "square" as ImportSourceType,
          sourceName: "square",
          fileName: `square_${recordType}`,
          recordType,
          rows,
          mapping,
        });
        await commitImportSession({ supabase, companyId, importSessionId: sessionId });
        results.push({ provider, record_type: recordType, rows_synced: rows.length, session_id: sessionId, error: null });
      } catch (err) {
        results.push({ provider, record_type: recordType, rows_synced: 0, session_id: null, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  if (provider === "hubspot") {
    const accessToken = await getValidHubSpotAccessToken({ supabase, companyId });

    const jobs: { recordType: "relationships" | "opportunities"; fetcher: () => Promise<RawImportRow[]> }[] = [
      { recordType: "relationships", fetcher: () => fetchHubSpotContacts(accessToken) },
      { recordType: "opportunities", fetcher: () => fetchHubSpotDeals(accessToken) },
    ];

    for (const { recordType, fetcher } of jobs) {
      try {
        const rows = await fetcher();
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        const mapping = guessImportMapping(headers, recordType);
        const { sessionId } = await createImportSessionFromRows({
          supabase,
          companyId,
          sourceType: "hubspot" as ImportSourceType,
          sourceName: "hubspot",
          fileName: `hubspot_${recordType}`,
          recordType,
          rows,
          mapping,
        });
        await commitImportSession({ supabase, companyId, importSessionId: sessionId });
        results.push({ provider, record_type: recordType, rows_synced: rows.length, session_id: sessionId, error: null });
      } catch (err) {
        results.push({ provider, record_type: recordType, rows_synced: 0, session_id: null, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  return results;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;

    if (!isSupportedProvider(provider)) {
      return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
    }

    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const supabase = await createClient();
    const results = await syncProvider(supabase, companyId, provider);

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed." },
      { status: 500 },
    );
  }
}
