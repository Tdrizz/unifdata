import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import {
  cleanImportValue,
  importFieldDefinitions,
  toImportDate,
  toImportNumber,
  type ImportRecordType,
} from "@/lib/import-engine";

type RouteContext = {
  params: Promise<{
    id: string;
    rowId: string;
  }>;
};

type RowAction = "skip" | "import_as_new" | "update_existing";

type PatchBody = {
  action?: RowAction;
  normalizedData?: Record<string, unknown>;
};

const validRecordTypes: ImportRecordType[] = [
  "relationships",
  "opportunities",
  "work",
  "revenue",
  "actions",
];

function isValidRecordType(value: string): value is ImportRecordType {
  return validRecordTypes.includes(value as ImportRecordType);
}

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

function normalizeEditedData({
  recordType,
  input,
}: {
  recordType: ImportRecordType;
  input: Record<string, unknown>;
}) {
  const normalizedData: Record<string, unknown> = {};
  const validationErrors: string[] = [];

  const fields = importFieldDefinitions[recordType];

  fields.forEach((field) => {
    const rawValue = input[field.key];

    if (field.type === "number") {
      const number = toImportNumber(rawValue);

      if (cleanImportValue(rawValue) && number === null) {
        validationErrors.push(`${field.label} must be a number.`);
      }

      normalizedData[field.key] = number;
      return;
    }

    if (field.type === "date") {
      const date = toImportDate(rawValue);

      if (cleanImportValue(rawValue) && !date) {
        validationErrors.push(`${field.label} must be a valid date.`);
      }

      normalizedData[field.key] = date;
      return;
    }

    normalizedData[field.key] = cleanImportValue(rawValue) || null;
  });

  fields.forEach((field) => {
    if (field.required && !cleanImportValue(normalizedData[field.key])) {
      validationErrors.push(`${field.label} is required.`);
    }
  });

  if (recordType === "opportunities") {
    normalizedData.status = normalizedData.status || "New";
  }

  if (recordType === "work") {
    normalizedData.status = normalizedData.status || "Scheduled";
    normalizedData.paid_status = normalizedData.paid_status || "Unpaid";
  }

  if (recordType === "revenue") {
    normalizedData.payment_status = normalizedData.payment_status || "Paid";
    normalizedData.sale_date =
      normalizedData.sale_date || new Date().toISOString().slice(0, 10);
  }

  if (recordType === "actions") {
    normalizedData.status = normalizedData.status || "Open";
  }

  return {
    normalizedData,
    validationErrors,
  };
}

async function updateSessionCounts({
  supabase,
  companyId,
  sessionId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  companyId: string;
  sessionId: string;
}) {
  const { data: rows, error: rowsError } = await supabase
    .from("import_session_rows")
    .select("status")
    .eq("import_session_id", sessionId)
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
    .eq("id", sessionId)
    .eq("company_id", companyId);

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  return {
    valid_rows: validRows,
    duplicate_rows: duplicateRows,
    error_rows: errorRows,
    skipped_rows: skippedRows,
  };
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
    const body = (await request.json()) as PatchBody;

    const supabase = await createClient();

    const { data: session, error: sessionError } = await supabase
      .from("import_sessions")
      .select("id, record_type, status")
      .eq("id", id)
      .eq("company_id", companyId)
      .single();

    if (sessionError || !session) {
      throw new Error(sessionError?.message || "Import session not found.");
    }

    if (session.status === "committed") {
      return NextResponse.json(
        { error: "Committed import sessions cannot be edited." },
        { status: 400 },
      );
    }

    if (!isValidRecordType(session.record_type)) {
      return NextResponse.json(
        { error: "Invalid import session record type." },
        { status: 400 },
      );
    }

    const { data: row, error: rowError } = await supabase
      .from("import_session_rows")
      .select("id, target_id, action")
      .eq("id", rowId)
      .eq("import_session_id", id)
      .eq("company_id", companyId)
      .single();

    if (rowError || !row) {
      throw new Error(rowError?.message || "Import row not found.");
    }

    if (body.normalizedData) {
      const { normalizedData, validationErrors } = normalizeEditedData({
        recordType: session.record_type,
        input: body.normalizedData,
      });

      const hasErrors = validationErrors.length > 0;

      const nextAction =
        hasErrors || row.action === "error"
          ? hasErrors
            ? "error"
            : "create"
          : row.action === "update" && row.target_id
            ? "update"
            : "create";

      const { error: updateError } = await supabase
        .from("import_session_rows")
        .update({
          normalized_data: normalizedData,
          action: nextAction,
          status: hasErrors ? "error" : "valid",
          validation_errors: validationErrors,
          duplicate_reason: null,
          match_confidence: null,
          target_id: nextAction === "create" ? null : row.target_id,
        })
        .eq("id", rowId)
        .eq("import_session_id", id)
        .eq("company_id", companyId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const counts = await updateSessionCounts({
        supabase,
        companyId,
        sessionId: id,
      });

      return NextResponse.json({
        ok: true,
        ...counts,
      });
    }

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

    const counts = await updateSessionCounts({
      supabase,
      companyId,
      sessionId: id,
    });

    return NextResponse.json({
      ok: true,
      ...counts,
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
