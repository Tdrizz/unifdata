import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiReport } from "./types";

export async function getAiReports(
  supabase: SupabaseClient,
  companyId: string,
): Promise<AiReport[]> {
  const { data, error } = await supabase
    .from("ai_reports")
    .select("id, report_type, summary, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(6);

  return (data ?? []) as AiReport[];
}
