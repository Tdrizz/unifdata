import { createAdminClient } from "@/lib/supabase/admin";
import { generateEmbedding } from "./generate";

type Table = "customers" | "jobs" | "sales";

const RPC_NAMES: Record<Table, string> = {
  customers: "search_customers_by_embedding",
  jobs: "search_jobs_by_embedding",
  sales: "search_sales_by_embedding",
};

export function syncEmbedding(
  table: Table,
  id: string,
  text: string,
  companyId: string,
): void {
  // Fire-and-forget: never await this in server actions
  void (async () => {
    try {
      if (!text.trim()) return;
      const embedding = await generateEmbedding(text);
      const supabase = createAdminClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from(table)
        .update({
          embedding: JSON.stringify(embedding),
          embedding_updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("company_id", companyId);
    } catch {
      // Non-critical: embedding failure must never break the main action
    }
  })();
}

export async function semanticSearch(
  table: Table,
  companyId: string,
  queryText: string,
  limit = 10,
): Promise<string[]> {
  try {
    const embedding = await generateEmbedding(queryText);
    const supabase = createAdminClient();
    const rpcName = RPC_NAMES[table];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc(rpcName, {
      p_company_id: companyId,
      p_embedding: JSON.stringify(embedding),
      p_limit: limit,
    });

    return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  } catch {
    return [];
  }
}
