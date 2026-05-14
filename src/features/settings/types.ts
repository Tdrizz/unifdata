import type { Database } from "@/types/db";

export type IntegrationRow = Database["public"]["Tables"]["integrations"]["Row"];

export type SettingsIntegration = Pick<
  IntegrationRow,
  "id" | "provider" | "provider_account_name" | "status" | "created_at"
>;
