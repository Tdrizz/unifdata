import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { error: "No company found for the current user." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const supabase = await createClient();

    const { data: session, error: sessionError } = await supabase
      .from("import_sessions")
      .select(
        `
        id,
        source_type,
        source_name,
        file_name,
        record_type,
        status,
        mapping,
        summary,
        total_rows,
        valid_rows,
        duplicate_rows,
        error_rows,
        created_rows,
        updated_rows,
        skipped_rows,
        error_message,
        created_at,
        committed_at
      `,
      )
      .eq("id", id)
      .eq("company_id", companyId)
      .single();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    const { data: rows, error: rowsError } = await supabase
      .from("import_session_rows")
      .select(
        `
        id,
        row_number,
        raw_data,
        normalized_data,
        action,
        status,
        target_table,
        target_id,
        match_confidence,
        duplicate_reason,
        validation_errors
      `,
      )
      .eq("company_id", companyId)
      .eq("import_session_id", id)
      .order("row_number", { ascending: true })
      .limit(100);

    if (rowsError) {
      throw new Error(rowsError.message);
    }

    return NextResponse.json({
      ok: true,
      session,
      rows: rows || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load import session.",
      },
      { status: 500 },
    );
  }
}
