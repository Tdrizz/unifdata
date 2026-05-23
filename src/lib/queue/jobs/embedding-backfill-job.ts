import { createAdminClient } from "@/lib/supabase/admin";
import { generateEmbedding, buildCustomerText, buildJobText, buildSaleText } from "@/lib/embeddings/generate";

export type EmbeddingBackfillJobData = {
  companyId: string;
  table: "customers" | "jobs" | "sales";
};

const BATCH_SIZE = 50;

export async function processEmbeddingBackfillJob(
  data: EmbeddingBackfillJobData,
): Promise<void> {
  const { companyId, table } = data;
  const supabase = createAdminClient();

  let offset = 0;
  let _processed = 0;

  while (true) {
    const { data: rows } = await supabase
      .from(table)
      .select("*")
      .eq("company_id", companyId)
      .is("embedding", null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      try {
        let text = "";
        if (table === "customers") {
          text = buildCustomerText(row as { name?: string | null; customer_type?: string | null; address?: string | null; notes?: string | null });
        } else if (table === "jobs") {
          text = buildJobText(row as { service_type?: string | null; status?: string | null; paid_status?: string | null; start_date?: string | null });
        } else {
          text = buildSaleText(row as { service_type?: string | null; payment_status?: string | null; sale_date?: string | null; source?: string | null });
        }

        if (!text.trim()) continue;

        const embedding = await generateEmbedding(text);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from(table)
          .update({
            embedding: JSON.stringify(embedding),
            embedding_updated_at: new Date().toISOString(),
          })
          .eq("id", (row as { id: string }).id)
          .eq("company_id", companyId);

        _processed++;
      } catch {
        // Skip failed rows, continue with the rest
      }
    }

    if (rows.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }
}
