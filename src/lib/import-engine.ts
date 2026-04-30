import { createHash } from "node:crypto";

export type ImportRecordType =
  | "relationships"
  | "opportunities"
  | "work"
  | "revenue"
  | "actions";

export type ImportSourceType =
  | "csv"
  | "google_sheets"
  | "quickbooks"
  | "stripe"
  | "square"
  | "manual";

export type RawImportRow = Record<string, unknown>;
export type ImportMapping = Record<string, string>;

type SupabaseWriteClient = {
  from: (table: string) => any;
};

export type ImportFieldDefinition = {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "number" | "date";
};

export const importRecordTypeOptions: {
  value: ImportRecordType;
  label: string;
  description: string;
}[] = [
  {
    value: "relationships",
    label: "Relationships",
    description:
      "People, customers, clients, patients, companies, or accounts.",
  },
  {
    value: "opportunities",
    label: "Opportunities",
    description:
      "Quotes, inquiries, proposals, treatment plans, policies, or deals.",
  },
  {
    value: "work",
    label: "Work",
    description:
      "Jobs, appointments, projects, service visits, orders, or tasks.",
  },
  {
    value: "revenue",
    label: "Revenue",
    description:
      "Payments, invoices, collections, commissions, sales, or balances.",
  },
  {
    value: "actions",
    label: "Actions",
    description: "Follow-ups, reminders, callbacks, renewals, or next steps.",
  },
];

export const importFieldDefinitions: Record<
  ImportRecordType,
  ImportFieldDefinition[]
> = {
  relationships: [
    { key: "name", label: "Name", required: true, type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "address", label: "Address", type: "text" },
    { key: "customer_type", label: "Type", type: "text" },
    { key: "notes", label: "Notes", type: "text" },
  ],
  opportunities: [
    {
      key: "service_requested",
      label: "Opportunity name",
      required: true,
      type: "text",
    },
    { key: "status", label: "Status", type: "text" },
    { key: "estimated_value", label: "Estimated value", type: "number" },
    { key: "source", label: "Source", type: "text" },
    { key: "next_follow_up_date", label: "Next follow-up date", type: "date" },
    { key: "notes", label: "Notes", type: "text" },
  ],
  work: [
    { key: "service_type", label: "Work name", required: true, type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "job_value", label: "Work value", type: "number" },
    { key: "start_date", label: "Start date", type: "date" },
    { key: "completed_date", label: "Completed date", type: "date" },
    { key: "paid_status", label: "Payment status", type: "text" },
    { key: "notes", label: "Notes", type: "text" },
  ],
  revenue: [
    { key: "amount", label: "Amount", required: true, type: "number" },
    { key: "payment_status", label: "Payment status", type: "text" },
    { key: "sale_date", label: "Revenue date", type: "date" },
    { key: "service_type", label: "Service / category", type: "text" },
    { key: "source", label: "Source", type: "text" },
  ],
  actions: [
    { key: "message", label: "Action", required: true, type: "text" },
    { key: "due_date", label: "Due date", required: true, type: "date" },
    { key: "status", label: "Status", type: "text" },
  ],
};

export function getTargetTable(recordType: ImportRecordType) {
  if (recordType === "relationships") {
    return "customers";
  }

  if (recordType === "opportunities") {
    return "leads";
  }

  if (recordType === "work") {
    return "jobs";
  }

  if (recordType === "revenue") {
    return "sales";
  }

  return "follow_ups";
}

export function cleanImportValue(value: unknown) {
  return String(value ?? "").trim();
}

export function toImportNumber(value: unknown) {
  const cleaned = cleanImportValue(value).replace(/[$,]/g, "");

  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

export function toImportDate(value: unknown) {
  const cleaned = cleanImportValue(value);

  if (!cleaned) {
    return null;
  }

  const parsed = Date.parse(cleaned);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString().slice(0, 10);
}

function getMappedValue(
  row: RawImportRow,
  mapping: ImportMapping,
  fieldKey: string,
) {
  const sourceColumn = mapping[fieldKey];

  if (!sourceColumn) {
    return "";
  }

  return cleanImportValue(row[sourceColumn]);
}

function normalizeStatus(value: unknown, fallback: string) {
  return cleanImportValue(value) || fallback;
}

export function hashImportData(data: unknown) {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

export function buildExternalId({
  sourceType,
  sourceName,
  rowNumber,
  providedExternalId,
}: {
  sourceType: ImportSourceType;
  sourceName?: string | null;
  rowNumber: number;
  providedExternalId?: string | null;
}) {
  if (providedExternalId) {
    return providedExternalId;
  }

  return `${sourceType}:${sourceName || "unknown"}:row_${rowNumber}`;
}

export function normalizeImportRow({
  recordType,
  row,
  mapping,
}: {
  recordType: ImportRecordType;
  row: RawImportRow;
  mapping: ImportMapping;
}) {
  const validationErrors: string[] = [];
  const normalizedData: Record<string, unknown> = {};

  const fields = importFieldDefinitions[recordType];

  fields.forEach((field) => {
    const rawValue = getMappedValue(row, mapping, field.key);

    if (field.required && !rawValue) {
      validationErrors.push(`${field.label} is required.`);
    }

    if (field.type === "number") {
      const number = toImportNumber(rawValue);

      if (rawValue && number === null) {
        validationErrors.push(`${field.label} must be a number.`);
      }

      normalizedData[field.key] = number;
      return;
    }

    if (field.type === "date") {
      const date = toImportDate(rawValue);

      if (rawValue && !date) {
        validationErrors.push(`${field.label} must be a valid date.`);
      }

      normalizedData[field.key] = date;
      return;
    }

    normalizedData[field.key] = rawValue || null;
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

async function findRelationshipDuplicate({
  supabase,
  companyId,
  normalizedData,
}: {
  supabase: SupabaseWriteClient;
  companyId: string;
  normalizedData: Record<string, unknown>;
}) {
  const email = cleanImportValue(normalizedData.email);
  const phone = cleanImportValue(normalizedData.phone);
  const name = cleanImportValue(normalizedData.name);
  const address = cleanImportValue(normalizedData.address);

  if (email) {
    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        targetTable: "customers",
        targetId: data.id,
        matchConfidence: 0.95,
        duplicateReason: "Matched existing relationship by email.",
      };
    }
  }

  if (phone) {
    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        targetTable: "customers",
        targetId: data.id,
        matchConfidence: 0.9,
        duplicateReason: "Matched existing relationship by phone.",
      };
    }
  }

  if (name && address) {
    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .eq("name", name)
      .eq("address", address)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        targetTable: "customers",
        targetId: data.id,
        matchConfidence: 0.8,
        duplicateReason: "Matched existing relationship by name and address.",
      };
    }
  }

  return null;
}

async function findSimpleDuplicate({
  supabase,
  companyId,
  recordType,
  normalizedData,
}: {
  supabase: SupabaseWriteClient;
  companyId: string;
  recordType: ImportRecordType;
  normalizedData: Record<string, unknown>;
}) {
  if (recordType === "relationships") {
    return findRelationshipDuplicate({
      supabase,
      companyId,
      normalizedData,
    });
  }

  if (recordType === "opportunities") {
    const name = cleanImportValue(normalizedData.service_requested);
    const value = normalizedData.estimated_value;

    if (!name) {
      return null;
    }

    let query = supabase
      .from("leads")
      .select("id")
      .eq("company_id", companyId)
      .eq("service_requested", name);

    if (value !== null && value !== undefined) {
      query = query.eq("estimated_value", value);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        targetTable: "leads",
        targetId: data.id,
        matchConfidence: 0.75,
        duplicateReason:
          "Matched existing opportunity by name and estimated value.",
      };
    }
  }

  if (recordType === "work") {
    const serviceType = cleanImportValue(normalizedData.service_type);
    const startDate = cleanImportValue(normalizedData.start_date);

    if (!serviceType) {
      return null;
    }

    let query = supabase
      .from("jobs")
      .select("id")
      .eq("company_id", companyId)
      .eq("service_type", serviceType);

    if (startDate) {
      query = query.eq("start_date", startDate);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        targetTable: "jobs",
        targetId: data.id,
        matchConfidence: 0.7,
        duplicateReason: "Matched existing work by name and start date.",
      };
    }
  }

  if (recordType === "revenue") {
    const amount = normalizedData.amount;
    const saleDate = cleanImportValue(normalizedData.sale_date);
    const serviceType = cleanImportValue(normalizedData.service_type);

    if (amount === null || amount === undefined) {
      return null;
    }

    let query = supabase
      .from("sales")
      .select("id")
      .eq("company_id", companyId)
      .eq("amount", amount);

    if (saleDate) {
      query = query.eq("sale_date", saleDate);
    }

    if (serviceType) {
      query = query.eq("service_type", serviceType);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        targetTable: "sales",
        targetId: data.id,
        matchConfidence: 0.7,
        duplicateReason:
          "Matched existing revenue by amount, date, and category.",
      };
    }
  }

  if (recordType === "actions") {
    const message = cleanImportValue(normalizedData.message);
    const dueDate = cleanImportValue(normalizedData.due_date);

    if (!message || !dueDate) {
      return null;
    }

    const { data, error } = await supabase
      .from("follow_ups")
      .select("id")
      .eq("company_id", companyId)
      .eq("message", message)
      .eq("due_date", dueDate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        targetTable: "follow_ups",
        targetId: data.id,
        matchConfidence: 0.8,
        duplicateReason: "Matched existing action by message and due date.",
      };
    }
  }

  return null;
}

export async function createImportSessionFromRows({
  supabase,
  companyId,
  sourceType,
  sourceName,
  fileName,
  recordType,
  rows,
  mapping,
  syncConnectionId = null,
}: {
  supabase: SupabaseWriteClient;
  companyId: string;
  sourceType: ImportSourceType;
  sourceName?: string | null;
  fileName?: string | null;
  recordType: ImportRecordType;
  rows: RawImportRow[];
  mapping: ImportMapping;
  syncConnectionId?: string | null;
}) {
  const { data: session, error: sessionError } = await supabase
    .from("import_sessions")
    .insert({
      company_id: companyId,
      sync_connection_id: syncConnectionId,
      source_type: sourceType,
      source_name: sourceName || null,
      file_name: fileName || null,
      record_type: recordType,
      status: "analyzing",
      mapping,
      total_rows: rows.length,
    })
    .select("id")
    .single();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const stagedRows = [];

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 1;
    const rawData = rows[index];

    const { normalizedData, validationErrors } = normalizeImportRow({
      recordType,
      row: rawData,
      mapping,
    });

    const externalHash = hashImportData(normalizedData);

    const duplicate = validationErrors.length
      ? null
      : await findSimpleDuplicate({
          supabase,
          companyId,
          recordType,
          normalizedData,
        });

    let action = "create";
    let status = "valid";

    if (validationErrors.length) {
      action = "error";
      status = "error";
    } else if (duplicate) {
      action = "review";
      status = "duplicate";
    }

    stagedRows.push({
      company_id: companyId,
      import_session_id: session.id,
      row_number: rowNumber,
      external_id: buildExternalId({
        sourceType,
        sourceName: sourceName || fileName || null,
        rowNumber,
      }),
      external_hash: externalHash,
      raw_data: rawData,
      normalized_data: normalizedData,
      target_table: duplicate?.targetTable || getTargetTable(recordType),
      target_id: duplicate?.targetId || null,
      action,
      status,
      match_confidence: duplicate?.matchConfidence || null,
      duplicate_reason: duplicate?.duplicateReason || null,
      validation_errors: validationErrors,
    });
  }

  if (stagedRows.length) {
    const { error: rowsError } = await supabase
      .from("import_session_rows")
      .insert(stagedRows);

    if (rowsError) {
      throw new Error(rowsError.message);
    }
  }

  const validRows = stagedRows.filter((row) => row.status === "valid").length;
  const duplicateRows = stagedRows.filter(
    (row) => row.status === "duplicate",
  ).length;
  const errorRows = stagedRows.filter((row) => row.status === "error").length;

  const summary = {
    source_type: sourceType,
    source_name: sourceName || null,
    file_name: fileName || null,
    record_type: recordType,
    total_rows: rows.length,
    valid_rows: validRows,
    duplicate_rows: duplicateRows,
    error_rows: errorRows,
  };

  const { error: updateSessionError } = await supabase
    .from("import_sessions")
    .update({
      status: "ready",
      valid_rows: validRows,
      duplicate_rows: duplicateRows,
      error_rows: errorRows,
      summary,
    })
    .eq("id", session.id)
    .eq("company_id", companyId);

  if (updateSessionError) {
    throw new Error(updateSessionError.message);
  }

  return {
    sessionId: session.id as string,
    summary,
  };
}

function buildInsertPayload({
  companyId,
  recordType,
  normalizedData,
}: {
  companyId: string;
  recordType: ImportRecordType;
  normalizedData: Record<string, unknown>;
}) {
  if (recordType === "relationships") {
    return {
      company_id: companyId,
      name: normalizedData.name,
      phone: normalizedData.phone || null,
      email: normalizedData.email || null,
      address: normalizedData.address || null,
      customer_type: normalizedData.customer_type || null,
      notes: normalizedData.notes || null,
    };
  }

  if (recordType === "opportunities") {
    return {
      company_id: companyId,
      service_requested: normalizedData.service_requested,
      status: normalizedData.status || "New",
      estimated_value: normalizedData.estimated_value || null,
      source: normalizedData.source || null,
      next_follow_up_date: normalizedData.next_follow_up_date || null,
      notes: normalizedData.notes || null,
    };
  }

  if (recordType === "work") {
    return {
      company_id: companyId,
      service_type: normalizedData.service_type,
      status: normalizedData.status || "Scheduled",
      job_value: normalizedData.job_value || null,
      start_date: normalizedData.start_date || null,
      completed_date: normalizedData.completed_date || null,
      paid_status: normalizedData.paid_status || "Unpaid",
      notes: normalizedData.notes || null,
    };
  }

  if (recordType === "revenue") {
    return {
      company_id: companyId,
      amount: normalizedData.amount,
      payment_status: normalizedData.payment_status || "Paid",
      sale_date:
        normalizedData.sale_date || new Date().toISOString().slice(0, 10),
      service_type: normalizedData.service_type || null,
      source: normalizedData.source || null,
    };
  }

  return {
    company_id: companyId,
    due_date: normalizedData.due_date,
    status: normalizedData.status || "Open",
    message: normalizedData.message,
  };
}

export async function commitImportSession({
  supabase,
  companyId,
  importSessionId,
}: {
  supabase: SupabaseWriteClient;
  companyId: string;
  importSessionId: string;
}) {
  const { data: session, error: sessionError } = await supabase
    .from("import_sessions")
    .select("id, source_type, source_name, file_name, record_type, status")
    .eq("id", importSessionId)
    .eq("company_id", companyId)
    .single();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    throw new Error("Import session not found.");
  }

  if (session.status === "committed") {
    throw new Error("This import session has already been committed.");
  }

  const recordType = session.record_type as ImportRecordType;
  const targetTable = getTargetTable(recordType);

  const { data: rows, error: rowsError } = await supabase
    .from("import_session_rows")
    .select(
      "id, row_number, external_id, external_hash, normalized_data, action, status",
    )
    .eq("company_id", companyId)
    .eq("import_session_id", importSessionId)
    .order("row_number", { ascending: true });

  if (rowsError) {
    throw new Error(rowsError.message);
  }

  const rowsToCreate = (rows || []).filter(
    (row: any) => row.status === "valid" && row.action === "create",
  );

  let createdRows = 0;
  let skippedRows = 0;
  let failedRows = 0;

  const { data: syncRun, error: syncRunError } = await supabase
    .from("sync_runs")
    .insert({
      company_id: companyId,
      sync_connection_id: null,
      status: "pending",
      records_seen: rows?.length || 0,
      metadata: {
        source_type: session.source_type,
        source_name: session.source_name,
        file_name: session.file_name,
        record_type: recordType,
        import_session_id: importSessionId,
      },
    })
    .select("id")
    .single();

  if (syncRunError) {
    throw new Error(syncRunError.message);
  }

  for (const row of rows || []) {
    if (row.status !== "valid" || row.action !== "create") {
      skippedRows += 1;

      const { error: skipError } = await supabase
        .from("import_session_rows")
        .update({ status: "skipped" })
        .eq("id", row.id)
        .eq("company_id", companyId);

      if (skipError) {
        throw new Error(skipError.message);
      }

      continue;
    }

    try {
      const payload = buildInsertPayload({
        companyId,
        recordType,
        normalizedData: row.normalized_data,
      });

      const { data: createdRecord, error: createError } = await supabase
        .from(targetTable)
        .insert(payload)
        .select("id")
        .single();

      if (createError) {
        throw new Error(createError.message);
      }

      createdRows += 1;

      const { error: rowUpdateError } = await supabase
        .from("import_session_rows")
        .update({
          status: "committed",
          target_table: targetTable,
          target_id: createdRecord.id,
        })
        .eq("id", row.id)
        .eq("company_id", companyId);

      if (rowUpdateError) {
        throw new Error(rowUpdateError.message);
      }

      if (row.external_id) {
        const { error: externalLinkError } = await supabase
          .from("external_record_links")
          .upsert({
            company_id: companyId,
            sync_connection_id: null,
            provider: session.source_type,
            external_id: row.external_id,
            external_hash: row.external_hash,
            internal_table: targetTable,
            internal_id: createdRecord.id,
            last_seen_at: new Date().toISOString(),
          });

        if (externalLinkError) {
          throw new Error(externalLinkError.message);
        }
      }
    } catch (error) {
      failedRows += 1;

      const { error: rowError } = await supabase
        .from("import_session_rows")
        .update({
          status: "error",
          action: "error",
          validation_errors: [
            error instanceof Error ? error.message : "Failed to commit row.",
          ],
        })
        .eq("id", row.id)
        .eq("company_id", companyId);

      if (rowError) {
        throw new Error(rowError.message);
      }
    }
  }

  const { error: importHistoryError } = await supabase.from("imports").insert({
    company_id: companyId,
    file_name: session.file_name || session.source_name || "import-session",
    import_type: recordType,
    status: failedRows > 0 ? "completed_with_errors" : "completed",
    records_created: createdRows,
  });

  if (importHistoryError) {
    throw new Error(importHistoryError.message);
  }

  const { error: finishSyncError } = await supabase
    .from("sync_runs")
    .update({
      status: failedRows > 0 ? "completed_with_errors" : "completed",
      records_created: createdRows,
      records_updated: 0,
      records_failed: failedRows,
      finished_at: new Date().toISOString(),
    })
    .eq("id", syncRun.id)
    .eq("company_id", companyId);

  if (finishSyncError) {
    throw new Error(finishSyncError.message);
  }

  const { error: finishSessionError } = await supabase
    .from("import_sessions")
    .update({
      status: failedRows > 0 ? "failed" : "committed",
      created_rows: createdRows,
      updated_rows: 0,
      skipped_rows: skippedRows,
      error_rows: failedRows,
      committed_at: new Date().toISOString(),
    })
    .eq("id", importSessionId)
    .eq("company_id", companyId);

  if (finishSessionError) {
    throw new Error(finishSessionError.message);
  }

  return {
    createdRows,
    skippedRows,
    failedRows,
  };
}
