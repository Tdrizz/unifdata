import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

export type IntegrationRow = Database["public"]["Tables"]["integrations"]["Row"];

export type SyncResult = {
  customersCreated: number;
  customersUpdated: number;
  recordsStaged: number;
  sessionIds: string[];
  error?: string;
};

export interface IntegrationSyncer {
  provider: string;
  sync(
    supabase: SupabaseClient<Database>,
    companyId: string,
    integration: IntegrationRow,
  ): Promise<SyncResult>;
}
