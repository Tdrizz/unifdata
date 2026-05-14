import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type BulkPatchBody = {
  action: "skip" | "update_existing";
  filter: "duplicates" | "errors";
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { error: "No company found for the current user." },
        { status: 401 },
      );
    }

    const { id: sessionId } = await context.params;
    const supabase = await createClient();

    const { action, filter } = (await request.json()) as BulkPatchBody;

    if (action !== "skip" && action !== "update_existing") {
      return NextResponse.json(
        { error: "Choose a valid bulk action." },
        { status: 400 },
      );
    }

    if (filter !== "duplicates" && filter !== "errors") {
      return NextResponse.json(
        { error: "Choose a valid filter." },
        { status: 400 },
      );
    }

    // Verify session belongs to company and is not committed/cancelled
    const { data: session, error: sessionError } = await supabase
      .from("import_sessions")
      .select("id, status")
      .eq("id", sessionId)
      .eq("company_id", companyId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Import session not found." },
        { status: 404 },
      );
    }

    if (session.status === "committed" || session.status === "cancelled") {
      return NextResponse.json(
        { error: "Committed or cancelled import sessions cannot be edited." },
        { status: 400 },
      );
    }

    const statusFilter = filter === "duplicates" ? "duplicate" : "error";

    const { data: rows, error: rowsError } = await supabase
      .from("import_session_rows")
      .select("id, target_id")
      .eq("import_session_id", sessionId)
      .eq("company_id", companyId)
      .eq("status", statusFilter);

    if (rowsError) {
      throw new Error(rowsError.message);
    }

    if (!rows?.length) {
      return NextResponse.json({ updatedCount: 0 });
    }

    let updatedCount = 0;

    for (const row of rows) {
      const resolvedAction =
        action === "update_existing" && row.target_id ? "update" : "skip";
      const resolvedStatus = resolvedAction === "skip" ? "skipped" : "valid";

      const { error: updateError } = await supabase
        .from("import_session_rows")
        .update({
          action: resolvedAction,
          status: resolvedStatus,
        })
        .eq("id", row.id)
        .eq("import_session_id", sessionId)
        .eq("company_id", companyId);

      if (!updateError) {
        updatedCount += 1;
      }
    }

    // Refresh session counts
    const { data: allRows } = await supabase
      .from("import_session_rows")
      .select("status")
      .eq("import_session_id", sessionId)
      .eq("company_id", companyId);

    const counts = {
      valid_rows: (allRows ?? []).filter((r) => r.status === "valid").length,
      duplicate_rows: (allRows ?? []).filter((r) => r.status === "duplicate")
        .length,
      error_rows: (allRows ?? []).filter((r) => r.status === "error").length,
      skipped_rows: (allRows ?? []).filter((r) => r.status === "skipped")
        .length,
    };

    await supabase
      .from("import_sessions")
      .update(counts)
      .eq("id", sessionId)
      .eq("company_id", companyId);

    return NextResponse.json({ ok: true, updatedCount, ...counts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to apply bulk action.",
      },
      { status: 500 },
    );
  }
}
