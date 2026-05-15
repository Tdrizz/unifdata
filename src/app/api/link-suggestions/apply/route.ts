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

    for (const update of updates) {
      if (
        !ALLOWED_TABLES.has(update.table) ||
        !ALLOWED_FIELDS.has(update.field) ||
        typeof update.record_id !== "string" ||
        typeof update.value !== "string"
      ) {
        continue;
      }

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
