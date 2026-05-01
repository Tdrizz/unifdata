import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

type RouteContext = {
  params: Promise<{
    id: string;
    rowId: string;
  }>;
};

type RowAction = "skip" | "import_as_new" | "update_existing";

function getActionUpdate(action: RowAction, hasTarget: boolean) {
  if (action === "skip") {
    return {
      action: "skip",
      status: "skipped",
    };
  }

  if (action === "import_as_new") {
    return {
      action: "create",
      status: "valid",
      target_id: null,
      duplicate_reason: null,
      match_confidence: null,
    };
  }

  if (action === "update_existing") {
    if (!hasTarget) {
      throw new Error("This row does not have an existing record to update.");
    }

    return {
      action: "update",
      status: "valid",
    };
  }

  throw new Error("Invalid row action.");
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { error: "No company found for the current user." },
        { status: 401 },
      );
    }

    const { id, rowId } = await context.params;
    const body = (await request.json()) as { action?: RowAction };
    const action = body.action;

    if (
      action !== "skip" &&
      action !== "import_as_new" &&
      action !== "update_existing"
    ) {
      return NextResponse.json(
        { error: "Choose a valid row action." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: row, error: rowError } = await supabase
      .from("import_session_rows")
      .select("id, target_id")
      .eq("id", rowId)
      .eq("import_session_id", id)
      .eq("company_id", companyId)
      .single();

    if (rowError) {
      throw new Error(rowError.message);
    }

    const update = getActionUpdate(action, Boolean(row.target_id));

    const { error: updateError } = await supabase
      .from("import_session_rows")
      .update(update)
      .eq("id", rowId)
      .eq("import_session_id", id)
      .eq("company_id", companyId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { data: rows, error: rowsError } = await supabase
      .from("import_session_rows")
      .select("status")
      .eq("import_session_id", id)
      .eq("company_id", companyId);

    if (rowsError) {
      throw new Error(rowsError.message);
    }

    const validRows = (rows || []).filter(
      (item) => item.status === "valid",
    ).length;
    const duplicateRows = (rows || []).filter(
      (item) => item.status === "duplicate",
    ).length;
    const errorRows = (rows || []).filter(
      (item) => item.status === "error",
    ).length;
    const skippedRows = (rows || []).filter(
      (item) => item.status === "skipped",
    ).length;

    const { error: sessionError } = await supabase
      .from("import_sessions")
      .update({
        valid_rows: validRows,
        duplicate_rows: duplicateRows,
        error_rows: errorRows,
        skipped_rows: skippedRows,
      })
      .eq("id", id)
      .eq("company_id", companyId);

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    return NextResponse.json({
      ok: true,
      valid_rows: validRows,
      duplicate_rows: duplicateRows,
      error_rows: errorRows,
      skipped_rows: skippedRows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update import row.",
      },
      { status: 500 },
    );
  }
}
