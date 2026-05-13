import type { Database } from "@/types/db";

export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type SyncConnectionRow = Database["public"]["Tables"]["sync_connections"]["Row"];
export type SyncRunRow = Database["public"]["Tables"]["sync_runs"]["Row"];
export type ImportSessionRow = Database["public"]["Tables"]["import_sessions"]["Row"];
export type IntegrationRow = Database["public"]["Tables"]["integrations"]["Row"];
