"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

export async function revertImportSession(sessionId: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");
  if (currentCompany.role !== "owner") throw new Error("Only owners can revert imports");
  const { company } = currentCompany;

  // Security: verify session belongs to this company
  const { data: session } = await supabase
    .from("import_sessions")
    .select("id, status, company_id")
    .eq("id", sessionId)
    .eq("company_id", company.id)
    .single();

  if (!session) throw new Error("Import session not found");
  if (session.status === "reverted") return;

  // Get all rows that were created by this import
  const { data: rows } = await supabase
    .from("import_session_rows")
    .select("target_table, target_id")
    .eq("import_session_id", sessionId)
    .eq("action", "create")
    .not("target_id", "is", null);

  if (rows && rows.length > 0) {
    // Group by target_table for batch deletes
    const byTable: Record<string, string[]> = {};
    for (const row of rows) {
      const table = row.target_table as string;
      if (!byTable[table]) byTable[table] = [];
      byTable[table].push(row.target_id as string);
    }

    for (const [table, ids] of Object.entries(byTable)) {
      if (table === "customers") {
        await supabase.from("customers").delete().in("id", ids).eq("company_id", company.id);
      } else if (table === "leads") {
        await supabase.from("leads").delete().in("id", ids).eq("company_id", company.id);
      } else if (table === "jobs") {
        await supabase.from("jobs").delete().in("id", ids).eq("company_id", company.id);
      } else if (table === "sales") {
        await supabase.from("sales").delete().in("id", ids).eq("company_id", company.id);
      } else if (table === "follow_ups") {
        await supabase.from("follow_ups").delete().in("id", ids).eq("company_id", company.id);
      }
    }
  }

  await supabase
    .from("import_sessions")
    .update({ status: "reverted" })
    .eq("id", sessionId);

  revalidatePath("/imports");
}
