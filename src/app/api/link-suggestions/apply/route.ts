import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

type LinkUpdate = {
  table: "jobs" | "sales";
  record_id: string;
  field: "lead_id" | "job_id";
  value: string;
};

const ALLOWED_TABLES = new Set(["jobs", "sales"]);
const ALLOWED_FIELDS = new Set(["lead_id", "job_id"]);

export async function POST(request: Request) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { error: "No company found for the current user." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const updates: LinkUpdate[] = body.suggestions ?? [];

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ ok: true, appliedCount: 0 });
    }

    const supabase = await createClient();
    let appliedCount = 0;

    // Collect FK values to validate ownership before applying
    const leadIds = new Set<string>();
    const jobIds = new Set<string>();
    for (const update of updates) {
      if (update.table === "jobs" && update.field === "lead_id" && typeof update.value === "string") leadIds.add(update.value);
      if (update.table === "sales" && update.field === "job_id" && typeof update.value === "string") jobIds.add(update.value);
    }

    // Batch-verify that FK targets belong to this company
    const [leadsCheck, jobsCheck] = await Promise.all([
      leadIds.size > 0
        ? supabase.from("leads").select("id").eq("company_id", companyId).in("id", Array.from(leadIds))
        : Promise.resolve({ data: [] }),
      jobIds.size > 0
        ? supabase.from("jobs").select("id").eq("company_id", companyId).in("id", Array.from(jobIds))
        : Promise.resolve({ data: [] }),
    ]);
    const validLeadIds = new Set((leadsCheck.data ?? []).map((r) => r.id));
    const validJobIds = new Set((jobsCheck.data ?? []).map((r) => r.id));

    for (const update of updates) {
      if (
        !ALLOWED_TABLES.has(update.table) ||
        !ALLOWED_FIELDS.has(update.field) ||
        typeof update.record_id !== "string" ||
        typeof update.value !== "string"
      ) {
        continue;
      }

      // Reject FK values that don't belong to this company
      if (update.field === "lead_id" && !validLeadIds.has(update.value)) continue;
      if (update.field === "job_id" && !validJobIds.has(update.value)) continue;

      const { error } =
        update.table === "jobs"
          ? await supabase
              .from("jobs")
              .update({ lead_id: update.value })
              .eq("id", update.record_id)
              .eq("company_id", companyId)
          : await supabase
              .from("sales")
              .update({ job_id: update.value })
              .eq("id", update.record_id)
              .eq("company_id", companyId);

      if (!error) {
        appliedCount += 1;
      }
    }

    return NextResponse.json({ ok: true, appliedCount });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to apply link suggestions.",
      },
      { status: 500 },
    );
  }
}
