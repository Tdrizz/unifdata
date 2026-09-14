import { commitImportSession } from "@/lib/import-engine";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CommitSyncResult = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
};

/**
 * Commit the import sessions a connected-integration sync just staged.
 *
 * Connecting an integration is an explicit act of trust, so its records go
 * straight into the app -- a sync used to leave everything parked in
 * import_sessions waiting for someone to find /imports and click through a
 * review step, which is why invoices from a "successful" sync never showed up
 * anywhere. CSV uploads still go through that review step; this is only for
 * providers the user deliberately connected.
 *
 * Sessions are committed in the order the syncer produced them (contacts
 * first), so sales and opportunities can resolve the contacts they belong to.
 * Each session is isolated: staged rows are already durable in the database, so
 * one session failing to commit must not discard the rest of the sync.
 */
export async function commitSyncSessions({
  supabase,
  companyId,
  sessionIds,
}: {
  supabase: SupabaseClient;
  companyId: string;
  sessionIds: string[];
}): Promise<CommitSyncResult> {
  const totals: CommitSyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const importSessionId of sessionIds) {
    try {
      const summary = await commitImportSession({
        supabase,
        companyId,
        importSessionId,
      });

      totals.created += summary.createdRows ?? 0;
      totals.updated += summary.updatedRows ?? 0;
      totals.skipped += summary.skippedRows ?? 0;
      totals.failed += summary.failedRows ?? 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import records.";
      console.error("[commitSyncSessions]", importSessionId, message);
      totals.errors.push(message);
    }
  }

  return totals;
}
