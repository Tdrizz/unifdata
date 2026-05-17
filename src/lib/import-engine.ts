import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone, normalizeEmail, normalizeName } from "./normalize";
export type { ImportRecordType, ImportFieldDefinition } from "./import-engine-fields";
export { importFieldDefinitions } from "./import-engine-fields";
import type { ImportRecordType } from "./import-engine-fields";
import { importFieldDefinitions } from "./import-engine-fields";

export type ImportSourceType =
  | "csv"
  | "google_sheets"
  | "quickbooks"
  | "square"
  | "hubspot"
  | "jobber"
  | "stripe"
  | "manual";

export type RawImportRow = Record<string, unknown>;
export type ImportMapping = Record<string, string>;

type SupabaseWriteClient = SupabaseClient;
type StagedImportSessionRow = {
  id: string;
  row_number: number;
  external_id: string | null;
  external_hash: string | null;
  normalized_data: Record<string, unknown>;
  action: string;
  status: string;
  target_table: string | null;
  target_id: string | null;
};

export type LinkageSuggestion = {
  table: "jobs" | "sales";
  record_id: string;
  record_label: string;
  field: "lead_id" | "job_id";
  suggested_id: string;
  suggested_label: string;
  customer_name: string | null;
  reason: string;
  confidence: number;
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

const importFieldSynonyms: Record<string, string[]> = {
  name: [
    "name",
    "full name",
    "customer",
    "customer name",
    "client",
    "client name",
    "patient",
    "patient name",
    "company",
    "company name",
    "account",
    "account name",
    "contact",
    "contact name",
    "person",
    "business",
    "business name",
    "first name",
    "firstname",
    "last name",
    "lastname",
  ],
  phone: [
    "phone",
    "phone number",
    "phonenumber",
    "mobile",
    "mobile number",
    "cell",
    "cell phone",
    "telephone",
    "tel",
    "contact phone",
    "work phone",
    "home phone",
    "primary phone",
  ],
  email: [
    "email",
    "email address",
    "emailaddress",
    "e-mail",
    "mail",
    "contact email",
    "work email",
    "primary email",
  ],
  address: [
    "address",
    "full address",
    "service address",
    "mailing address",
    "street address",
    "street",
    "location",
    "home address",
    "billing address",
    "shipping address",
    "property address",
    "site address",
  ],
  customer_type: [
    "type",
    "customer type",
    "client type",
    "account type",
    "contact type",
    "category",
    "classification",
    "segment",
    "group",
  ],
  notes: [
    "notes",
    "note",
    "comments",
    "comment",
    "description",
    "details",
    "memo",
    "internal notes",
    "additional info",
    "remarks",
  ],

  customer_name: [
    "customer",
    "customer name",
    "client",
    "client name",
    "contact",
    "contact name",
    "account",
    "account name",
    "person",
    "patient",
    "business",
    "company",
    "for",
    "belongs to",
    "linked to",
  ],

  service_requested: [
    "opportunity",
    "opportunity name",
    "lead",
    "lead name",
    "quote",
    "estimate",
    "proposal",
    "deal",
    "deal name",
    "inquiry",
    "service",
    "service requested",
    "service type",
    "job type",
    "treatment plan",
    "title",
    "name",
    "project",
    "project name",
    "description",
    "subject",
    "request",
    "what",
  ],
  status: [
    "status",
    "stage",
    "pipeline stage",
    "state",
    "current status",
    "lead status",
    "job status",
    "phase",
  ],
  estimated_value: [
    "estimated value",
    "estimate value",
    "value",
    "amount",
    "estimate amount",
    "quote amount",
    "deal value",
    "price",
    "budget",
    "quoted price",
    "bid",
    "bid amount",
    "cost",
    "potential value",
    "opportunity value",
  ],
  source: [
    "source",
    "lead source",
    "channel",
    "referral source",
    "referral",
    "how did you find us",
    "marketing source",
    "origin",
    "where from",
  ],
  next_follow_up_date: [
    "next follow up",
    "next follow-up",
    "follow up date",
    "follow-up date",
    "next action date",
    "next contact date",
    "next touchpoint",
    "follow up",
    "follow-up",
  ],

  lead_name: [
    "opportunity",
    "opportunity name",
    "lead",
    "lead name",
    "quote",
    "estimate",
    "estimate name",
    "proposal",
    "ref",
    "reference",
    "project ref",
    "linked opportunity",
    "related opportunity",
  ],

  service_type: [
    "work",
    "work name",
    "job",
    "job name",
    "project",
    "project name",
    "appointment",
    "order",
    "service type",
    "service",
    "service name",
    "category",
    "task",
    "task name",
    "title",
    "description",
    "type",
    "what",
  ],
  job_value: [
    "job value",
    "work value",
    "project value",
    "amount",
    "value",
    "price",
    "cost",
    "total",
    "invoice amount",
    "job amount",
    "contract value",
    "contract amount",
  ],
  start_date: [
    "start date",
    "startdate",
    "scheduled date",
    "appointment date",
    "service date",
    "job date",
    "date",
    "begin date",
    "start",
    "scheduled",
    "visit date",
    "work date",
  ],
  completed_date: [
    "completed date",
    "completion date",
    "finished date",
    "end date",
    "done date",
    "closed date",
    "completed",
  ],
  paid_status: [
    "paid status",
    "payment status",
    "paid",
    "payment",
    "payment state",
    "invoice status",
    "billing status",
  ],

  amount: [
    "amount",
    "payment",
    "payment amount",
    "revenue",
    "invoice amount",
    "sale amount",
    "total",
    "total amount",
    "price",
    "charge",
    "collected",
    "received",
  ],
  payment_status: [
    "payment status",
    "paid status",
    "status",
    "billing status",
    "invoice status",
    "collection status",
  ],
  sale_date: [
    "date",
    "sale date",
    "payment date",
    "invoice date",
    "paid date",
    "transaction date",
    "revenue date",
    "received date",
  ],
  due_date: [
    "due date",
    "duedate",
    "follow up date",
    "follow-up date",
    "deadline",
    "target date",
    "reminder date",
    "scheduled date",
    "date",
  ],
  message: [
    "message",
    "action",
    "task",
    "follow up",
    "follow-up",
    "reminder",
    "note",
    "description",
    "what",
    "todo",
    "to do",
    "next step",
    "next action",
    "subject",
  ],
};

function normalizeImportHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function guessImportMapping(
  headers: string[],
  recordType: ImportRecordType,
) {
  const mapping: ImportMapping = {};

  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeImportHeader(header),
  }));

  importFieldDefinitions[recordType].forEach((field) => {
    const possibleNames = [
      field.key,
      field.label,
      ...(importFieldSynonyms[field.key] || []),
    ];

    const normalizedPossibleNames = possibleNames.map((name) =>
      normalizeImportHeader(name),
    );

    const exactMatch = normalizedHeaders.find((header) =>
      normalizedPossibleNames.includes(header.normalized),
    );

    if (exactMatch) {
      mapping[field.key] = exactMatch.original;
      return;
    }

    const partialMatch = normalizedHeaders.find((header) =>
      normalizedPossibleNames.some(
        (possibleName) =>
          header.normalized.includes(possibleName) ||
          possibleName.includes(header.normalized),
      ),
    );

    if (partialMatch) {
      mapping[field.key] = partialMatch.original;
    }
  });

  return mapping;
}

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

  // Google Sheets exports date cells as serial numbers (days since Dec 30 1899)
  // when the column format is set to "Number". Modern dates are roughly 40000–60000.
  // Date.parse would misread e.g. "46162" as year 46162 CE, producing "+046162-01-01".
  const num = Number(cleaned);
  if (!Number.isNaN(num) && Number.isInteger(num) && num > 20000 && num < 100000) {
    // 25569 = days from Dec 30 1899 to Jan 1 1970 (Unix epoch)
    const d = new Date((num - 25569) * 86400 * 1000);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }

  const parsed = Date.parse(cleaned);

  if (Number.isNaN(parsed)) {
    return null;
  }

  const d = new Date(parsed);
  // Reject implausible years that sneak through (e.g. bare 4-digit non-serial numbers)
  if (d.getUTCFullYear() < 1900 || d.getUTCFullYear() > 2200) {
    return null;
  }

  return d.toISOString().slice(0, 10);
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

  // Normalize contact fields for reliable duplicate detection and search
  if (recordType === "relationships") {
    if (normalizedData.phone) {
      normalizedData.phone = normalizePhone(normalizedData.phone) ?? normalizedData.phone;
    }
    if (normalizedData.email) {
      normalizedData.email = normalizeEmail(normalizedData.email) ?? normalizedData.email;
    }
    if (normalizedData.name) {
      normalizedData.name = normalizeName(normalizedData.name) ?? normalizedData.name;
    }
  }

  if (normalizedData.customer_name) {
    normalizedData.customer_name = normalizeName(normalizedData.customer_name) ?? normalizedData.customer_name;
  }

  if (normalizedData.lead_name) {
    normalizedData.lead_name = normalizeName(normalizedData.lead_name) ?? normalizedData.lead_name;
  }

  if (recordType === "opportunities") {
    normalizedData.status = normalizedData.status || "New";
  }

  if (recordType === "work") {
    normalizedData.status = normalizedData.status || "Scheduled";
    normalizedData.paid_status = normalizedData.paid_status || "Unpaid";
  }

  if (recordType === "revenue") {
    normalizedData.payment_status = normalizedData.payment_status || "Paid";
    if (!normalizedData.sale_date) {
      normalizedData.sale_date = new Date().toISOString().slice(0, 10);
      normalizedData._date_defaulted = true;
    }
  }

  if (recordType === "actions") {
    normalizedData.status = normalizedData.status || "Open";
    if (!normalizedData.due_date) {
      normalizedData.due_date = new Date().toISOString().slice(0, 10);
      normalizedData._date_defaulted = true;
    }
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
  const email = normalizeEmail(cleanImportValue(normalizedData.email)) ?? cleanImportValue(normalizedData.email);
  const phone = normalizePhone(cleanImportValue(normalizedData.phone)) ?? cleanImportValue(normalizedData.phone);
  const name = cleanImportValue(normalizedData.name);
  const address = cleanImportValue(normalizedData.address);

  if (email) {
    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .eq("email", email)
      .limit(1)
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
      .limit(1)
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
      .limit(1)
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
      .limit(1)
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

/**
 * Filter rows to only those that are new or changed relative to what's already
 * committed in external_record_links. Rows must include an `external_id` field
 * (the provider's native record ID). Rows without an external_id are always
 * included (they can't be deduped by external identity).
 */
export async function filterFreshRows({
  supabase,
  companyId,
  provider,
  recordType,
  rows,
  mapping,
}: {
  supabase: SupabaseWriteClient;
  companyId: string;
  provider: string;
  recordType: ImportRecordType;
  rows: RawImportRow[];
  mapping: ImportMapping;
}): Promise<RawImportRow[]> {
  const targetTable = getTargetTable(recordType);

  // Collect rows that have an external_id so we can batch-fetch their links
  const rowsWithId = rows.filter((r) => typeof r.external_id === "string" && r.external_id);
  if (rowsWithId.length === 0) return rows; // nothing to filter

  // Build a map: external_id → hash (of normalized data)
  const idToHash = new Map<string, string>();
  for (const row of rowsWithId) {
    const { normalizedData } = normalizeImportRow({ recordType, row, mapping });
    const hash = hashImportData(normalizedData);
    idToHash.set(row.external_id as string, hash);
  }

  // Fetch existing committed links for this company + provider + table
  const { data: existingLinks } = await supabase
    .from("external_record_links")
    .select("external_id, external_hash")
    .eq("company_id", companyId)
    .eq("provider", provider)
    .eq("internal_table", targetTable)
    .in("external_id", Array.from(idToHash.keys()));

  // Build a set of external_ids that are unchanged (same hash as committed)
  const unchangedIds = new Set<string>();
  for (const link of existingLinks ?? []) {
    const currentHash = idToHash.get(link.external_id);
    if (currentHash && currentHash === link.external_hash) {
      unchangedIds.add(link.external_id);
    }
  }

  // Return rows that are new (no link) or changed (hash differs)
  return rows.filter((r) => {
    if (typeof r.external_id !== "string" || !r.external_id) return true;
    return !unchangedIds.has(r.external_id);
  });
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

  try {
    const stagedRows = [];

    // Within-session dedup sets for relationship imports
    const sessionSeenEmails = new Set<string>();
    const sessionSeenPhones = new Set<string>();

    for (let index = 0; index < rows.length; index += 1) {
      const rowNumber = index + 1;
      const rawData = rows[index];

      const { normalizedData, validationErrors } = normalizeImportRow({
        recordType,
        row: rawData,
        mapping,
      });

      const externalHash = hashImportData(normalizedData);

      // Within-session dedup for customer imports
      let withinSessionDuplicate: { duplicateReason: string } | null = null;
      if (recordType === "relationships" && !validationErrors.length) {
        const rowEmail = normalizeEmail(cleanImportValue(normalizedData.email));
        const rowPhone = normalizePhone(cleanImportValue(normalizedData.phone));

        if (rowEmail && sessionSeenEmails.has(rowEmail)) {
          withinSessionDuplicate = { duplicateReason: "Another row in this import has the same email address." };
        } else if (rowPhone && sessionSeenPhones.has(rowPhone)) {
          withinSessionDuplicate = { duplicateReason: "Another row in this import has the same phone number." };
        } else {
          if (rowEmail) sessionSeenEmails.add(rowEmail);
          if (rowPhone) sessionSeenPhones.add(rowPhone);
        }
      }

      const duplicate = (validationErrors.length || withinSessionDuplicate)
        ? withinSessionDuplicate
          ? { targetTable: getTargetTable(recordType), targetId: null, matchConfidence: 0.9, duplicateReason: withinSessionDuplicate.duplicateReason }
          : null
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
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to analyze import session.";

    await supabase
      .from("import_sessions")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", session.id)
      .eq("company_id", companyId);

    throw error;
  }
}

function buildInsertPayload({
  companyId,
  recordType,
  normalizedData,
  resolvedCustomerId,
  resolvedLeadId,
}: {
  companyId: string;
  recordType: ImportRecordType;
  normalizedData: Record<string, unknown>;
  resolvedCustomerId?: string | null;
  resolvedLeadId?: string | null;
}) {
  // Re-validate dates at insert time so corrupted values (e.g. Sheets serials stored
  // in old sessions) don't reach Postgres as bad timestamptz strings.
  function safeDate(value: unknown): string | null {
    const reparsed = toImportDate(value);
    return reparsed || null;
  }

  function safeDateOrToday(value: unknown): string {
    return safeDate(value) ?? new Date().toISOString().slice(0, 10);
  }

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
      customer_id: resolvedCustomerId || null,
      service_requested: normalizedData.service_requested,
      status: normalizedData.status || "New",
      estimated_value: normalizedData.estimated_value || null,
      source: normalizedData.source || null,
      next_follow_up_date: safeDate(normalizedData.next_follow_up_date),
      notes: normalizedData.notes || null,
    };
  }

  if (recordType === "work") {
    return {
      company_id: companyId,
      customer_id: resolvedCustomerId || null,
      lead_id: resolvedLeadId || null,
      service_type: normalizedData.service_type,
      status: normalizedData.status || "Scheduled",
      job_value: normalizedData.job_value || null,
      start_date: safeDate(normalizedData.start_date),
      completed_date: safeDate(normalizedData.completed_date),
      paid_status: normalizedData.paid_status || "Unpaid",
      notes: normalizedData.notes || null,
    };
  }

  if (recordType === "revenue") {
    return {
      company_id: companyId,
      customer_id: resolvedCustomerId || null,
      amount: normalizedData.amount,
      payment_status: normalizedData.payment_status || "Paid",
      sale_date: safeDateOrToday(normalizedData.sale_date),
      service_type: normalizedData.service_type || null,
      source: normalizedData.source || null,
    };
  }

  return {
    company_id: companyId,
    customer_id: resolvedCustomerId || null,
    due_date: safeDateOrToday(normalizedData.due_date),
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

  if (session.status === "cancelled") {
    throw new Error("This import session has been cancelled.");
  }

  const recordType = session.record_type as ImportRecordType;
  const targetTable = getTargetTable(recordType);

  const { data: rows, error: rowsError } = await supabase
    .from("import_session_rows")
    .select(
      "id, row_number, external_id, external_hash, normalized_data, action, status, target_table, target_id",
    )
    .eq("company_id", companyId)
    .eq("import_session_id", importSessionId)
    .order("row_number", { ascending: true });

  if (rowsError) {
    throw new Error(rowsError.message);
  }

  let createdRows = 0;
  let updatedRows = 0;
  let skippedRows = 0;
  let failedRows = 0;

  type CreatedJobInfo = { id: string; customer_id: string | null; service_type: string | null; start_date: string | null };
  type CreatedSaleInfo = { id: string; customer_id: string | null; service_type: string | null; sale_date: string | null; amount: number | null };
  const createdJobs: CreatedJobInfo[] = [];
  const createdSales: CreatedSaleInfo[] = [];

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

  const stagedSessionRows = (rows || []) as StagedImportSessionRow[];

  const customerNameCache = new Map<string, string | null>();

  async function resolveCustomerId(
    customerName: string,
  ): Promise<{ id: string | null; unlinked: boolean }> {
    const key = customerName.trim().toLowerCase();

    if (customerNameCache.has(key)) {
      const cached = customerNameCache.get(key) ?? null;
      return { id: cached, unlinked: cached === null };
    }

    // Try exact match first
    const { data: exactMatch } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .eq("name", customerName.trim())
      .limit(1)
      .maybeSingle();

    if (exactMatch) {
      customerNameCache.set(key, exactMatch.id);
      return { id: exactMatch.id, unlinked: false };
    }

    // Fuzzy fallback — check for single unambiguous match
    const { data: fuzzyMatches } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .ilike("name", `%${customerName.trim()}%`)
      .limit(2);

    if (fuzzyMatches && fuzzyMatches.length === 1) {
      customerNameCache.set(key, fuzzyMatches[0].id);
      return { id: fuzzyMatches[0].id, unlinked: false };
    }

    // Zero matches or ambiguous multiple matches — mark as unlinked
    customerNameCache.set(key, null);
    return { id: null, unlinked: true };
  }

  const leadNameCache = new Map<string, string | null>();

  async function resolveLeadId(
    leadName: string,
    customerId: string | null,
  ): Promise<string | null> {
    const key = `${leadName.trim().toLowerCase()}:${customerId ?? ""}`;

    if (leadNameCache.has(key)) {
      return leadNameCache.get(key) ?? null;
    }

    let query = supabase
      .from("leads")
      .select("id")
      .eq("company_id", companyId)
      .ilike("service_requested", `%${leadName.trim()}%`)
      .limit(2);

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }

    const { data } = await query;

    const resolved = data && data.length === 1 ? data[0].id : null;
    leadNameCache.set(key, resolved);
    return resolved;
  }

  for (const row of stagedSessionRows) {
    if (
      row.status !== "valid" ||
      (row.action !== "create" && row.action !== "update")
    ) {
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
      const customerNameRaw = cleanImportValue(
        row.normalized_data.customer_name,
      );
      const customerResolution = customerNameRaw
        ? await resolveCustomerId(customerNameRaw)
        : { id: null, unlinked: false };
      const resolvedCustomerId = customerResolution.id;
      const customerUnlinked = customerResolution.unlinked;

      const leadNameRaw = cleanImportValue(row.normalized_data.lead_name);
      const resolvedLeadId = leadNameRaw
        ? await resolveLeadId(leadNameRaw, resolvedCustomerId)
        : null;

      // Attach linkage metadata to normalized_data for UI display
      const normalizedDataWithMeta = {
        ...row.normalized_data,
        ...(customerUnlinked && customerNameRaw
          ? { _customer_unlinked: true }
          : {}),
      };

      const payload = buildInsertPayload({
        companyId,
        recordType,
        normalizedData: normalizedDataWithMeta,
        resolvedCustomerId,
        resolvedLeadId,
      });

      let internalId: string;

      if (row.action === "update") {
        if (!row.target_id) {
          throw new Error("Cannot update row without a target record.");
        }

        const { company_id: _removedCompanyId, ...updatePayload } = payload;
        void _removedCompanyId;

        const { error: updateError } = await supabase
          .from(targetTable)
          .update(updatePayload)
          .eq("id", row.target_id)
          .eq("company_id", companyId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        internalId = row.target_id;
        updatedRows += 1;
      } else {
        const { data: createdRecord, error: createError } = await supabase
          .from(targetTable)
          .insert(payload)
          .select("id")
          .single();

        if (createError) {
          throw new Error(createError.message);
        }

        internalId = createdRecord.id;
        createdRows += 1;

        if (recordType === "work") {
          createdJobs.push({
            id: internalId,
            customer_id: resolvedCustomerId ?? null,
            service_type: cleanImportValue(row.normalized_data.service_type) || null,
            start_date: cleanImportValue(row.normalized_data.start_date) || null,
          });
        }

        if (recordType === "revenue") {
          createdSales.push({
            id: internalId,
            customer_id: resolvedCustomerId ?? null,
            service_type: cleanImportValue(row.normalized_data.service_type) || null,
            sale_date: cleanImportValue(row.normalized_data.sale_date) || null,
            amount: (row.normalized_data.amount as number) ?? null,
          });
        }
      }

      const { error: rowUpdateError } = await supabase
        .from("import_session_rows")
        .update({
          status: "committed",
          target_table: targetTable,
          target_id: internalId,
        })
        .eq("id", row.id)
        .eq("company_id", companyId);

      if (rowUpdateError) {
        throw new Error(rowUpdateError.message);
      }

      if (row.external_id) {
        const { error: externalLinkError } = await supabase
          .from("external_record_links")
          .upsert(
            {
              company_id: companyId,
              sync_connection_id: null,
              provider: session.source_type,
              external_id: row.external_id,
              external_hash: row.external_hash,
              internal_table: targetTable,
              internal_id: internalId,
              last_seen_at: new Date().toISOString(),
            },
            {
              onConflict: "company_id,provider,external_id,internal_table",
            },
          );

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
      records_updated: updatedRows,
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
      updated_rows: updatedRows,
      skipped_rows: skippedRows,
      error_rows: failedRows,
      committed_at: new Date().toISOString(),
    })
    .eq("id", importSessionId)
    .eq("company_id", companyId);

  if (finishSessionError) {
    throw new Error(finishSessionError.message);
  }

  const linkageSuggestions: LinkageSuggestion[] = [];

  // Suggest job → lead links for newly created jobs that have a customer but no lead
  if (createdJobs.length > 0) {
    for (const job of createdJobs) {
      if (!job.customer_id || !job.service_type) continue;

      const { data: candidateLeads } = await supabase
        .from("leads")
        .select("id, service_requested, status")
        .eq("company_id", companyId)
        .eq("customer_id", job.customer_id)
        .not("status", "ilike", "%won%")
        .not("status", "ilike", "%lost%")
        .not("status", "ilike", "%cancel%")
        .limit(3);

      if (!candidateLeads || candidateLeads.length === 0) continue;

      const jobWords = job.service_type.toLowerCase().split(/\s+/);
      let bestLead: typeof candidateLeads[number] | null = null;
      let bestScore = 0;

      for (const lead of candidateLeads) {
        const leadText = (lead.service_requested ?? "").toLowerCase();
        const matches = jobWords.filter((w) => w.length > 2 && leadText.includes(w)).length;
        const score = matches / Math.max(jobWords.length, 1);
        if (score > bestScore) {
          bestScore = score;
          bestLead = lead;
        }
      }

      if (bestLead && bestScore >= 0.4) {
        const { data: customer } = await supabase
          .from("customers")
          .select("name")
          .eq("id", job.customer_id)
          .single();

        linkageSuggestions.push({
          table: "jobs",
          record_id: job.id,
          record_label: job.service_type,
          field: "lead_id",
          suggested_id: bestLead.id,
          suggested_label: bestLead.service_requested ?? "Opportunity",
          customer_name: customer?.name ?? null,
          reason: `Job and opportunity are for the same customer and share similar keywords.`,
          confidence: Math.round(bestScore * 100) / 100,
        });
      }
    }
  }

  // Suggest sale → job links for newly created sales with a customer
  if (createdSales.length > 0) {
    for (const sale of createdSales) {
      if (!sale.customer_id) continue;

      let query = supabase
        .from("jobs")
        .select("id, service_type, start_date")
        .eq("company_id", companyId)
        .eq("customer_id", sale.customer_id)
        .limit(5);

      if (sale.sale_date) {
        // Look for jobs within ±60 days of the sale date
        const saleTs = new Date(sale.sale_date).getTime();
        const dayMs = 86400000;
        const fromDate = new Date(saleTs - 60 * dayMs).toISOString().slice(0, 10);
        const toDate = new Date(saleTs + 60 * dayMs).toISOString().slice(0, 10);
        query = query.gte("start_date", fromDate).lte("start_date", toDate);
      }

      const { data: candidateJobs } = await query;

      if (!candidateJobs || candidateJobs.length !== 1) continue;

      const matchedJob = candidateJobs[0];
      const { data: customer } = await supabase
        .from("customers")
        .select("name")
        .eq("id", sale.customer_id)
        .single();

      linkageSuggestions.push({
        table: "sales",
        record_id: sale.id,
        record_label: sale.service_type ?? `$${sale.amount ?? ""}`,
        field: "job_id",
        suggested_id: matchedJob.id,
        suggested_label: matchedJob.service_type ?? "Job",
        customer_name: customer?.name ?? null,
        reason: `Sale and job are for the same customer within a similar time period.`,
        confidence: 0.7,
      });
    }
  }

  return {
    createdRows,
    updatedRows,
    skippedRows,
    failedRows,
    linkageSuggestions,
  };
}
