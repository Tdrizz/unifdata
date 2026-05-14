import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import type {
  CustomerRow,
  SyncConnectionRow,
  SyncRunRow,
  ImportSessionRow,
  IntegrationRow,
} from "./types";

export type ImportsCustomer = Pick<
  CustomerRow,
  "id" | "name" | "phone" | "email" | "address" | "customer_type" | "created_at"
>;

export type ImportsSyncConnection = Pick<
  SyncConnectionRow,
  | "id"
  | "name"
  | "source_type"
  | "source_name"
  | "record_type"
  | "sync_frequency"
  | "status"
  | "last_sync_at"
  | "created_at"
>;

export type ImportsSyncRun = Pick<
  SyncRunRow,
  | "id"
  | "status"
  | "records_seen"
  | "records_created"
  | "records_updated"
  | "records_failed"
  | "error_message"
  | "started_at"
  | "finished_at"
  | "metadata"
>;

export type ImportsImportSession = Pick<
  ImportSessionRow,
  | "id"
  | "source_type"
  | "source_name"
  | "file_name"
  | "record_type"
  | "status"
  | "total_rows"
  | "valid_rows"
  | "duplicate_rows"
  | "error_rows"
  | "created_rows"
  | "updated_rows"
  | "skipped_rows"
  | "created_at"
  | "committed_at"
>;

export type ImportsIntegration = Pick<
  IntegrationRow,
  "id" | "provider" | "provider_account_name" | "status" | "created_at"
>;

export type ImportsPageData = {
  customers: ImportsCustomer[];
  syncConnections: ImportsSyncConnection[];
  syncRuns: ImportsSyncRun[];
  importSessions: ImportsImportSession[];
  integrations: ImportsIntegration[];
};

export async function getImportsPageData(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<ImportsPageData> {
  const [
    customersResult,
    syncConnectionsResult,
    syncRunsResult,
    importSessionsResult,
    integrationsResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, email, address, customer_type, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),

    supabase
      .from("sync_connections")
      .select(
        "id, name, source_type, source_name, record_type, sync_frequency, status, last_sync_at, created_at",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),

    supabase
      .from("sync_runs")
      .select(
        "id, status, records_seen, records_created, records_updated, records_failed, error_message, started_at, finished_at, metadata",
      )
      .eq("company_id", companyId)
      .order("started_at", { ascending: false })
      .limit(8),

    supabase
      .from("import_sessions")
      .select(
        "id, source_type, source_name, file_name, record_type, status, total_rows, valid_rows, duplicate_rows, error_rows, created_rows, updated_rows, skipped_rows, created_at, committed_at",
      )
      .eq("company_id", companyId)
      .in("status", [
        "draft",
        "analyzing",
        "ready",
        "failed",
        "committed",
        "cancelled",
      ])
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("integrations")
      .select("id, provider, provider_account_name, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    customers: (customersResult.data ?? []) as ImportsCustomer[],
    syncConnections: (syncConnectionsResult.data ?? []) as ImportsSyncConnection[],
    syncRuns: (syncRunsResult.data ?? []) as ImportsSyncRun[],
    importSessions: (importSessionsResult.data ?? []) as ImportsImportSession[],
    integrations: (integrationsResult.data ?? []) as ImportsIntegration[],
  };
}
