import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import {
  createImportSessionFromRows,
  importFieldDefinitions,
  type ImportMapping,
  type ImportRecordType,
  type RawImportRow,
} from "@/lib/import-engine";

const validRecordTypes: ImportRecordType[] = [
  "relationships",
  "opportunities",
  "work",
  "revenue",
  "actions",
];

const fieldSynonyms: Record<string, string[]> = {
  name: ["name", "customer", "client", "patient", "company", "account"],
  phone: ["phone", "phone number", "mobile", "cell", "contact phone"],
  email: ["email", "email address", "contact email"],
  address: ["address", "service address", "mailing address", "location"],
  customer_type: ["type", "customer type", "client type", "category"],
  notes: ["notes", "note", "comments", "description"],

  service_requested: [
    "opportunity",
    "lead",
    "quote",
    "estimate",
    "proposal",
    "deal",
    "inquiry",
    "service",
    "service requested",
    "treatment plan",
  ],
  status: ["status", "stage", "pipeline stage"],
  estimated_value: [
    "estimated value",
    "value",
    "amount",
    "estimate amount",
    "quote amount",
    "deal value",
  ],
  source: ["source", "lead source", "channel", "referral source"],
  next_follow_up_date: [
    "next follow up",
    "next follow-up",
    "follow up date",
    "follow-up date",
    "next action date",
  ],

  service_type: [
    "work",
    "job",
    "project",
    "appointment",
    "order",
    "service type",
    "category",
  ],
  job_value: ["job value", "work value", "project value", "amount", "value"],
  start_date: ["start date", "scheduled date", "appointment date"],
  completed_date: ["completed date", "completion date", "finished date"],
  paid_status: ["paid status", "payment status", "paid"],

  amount: ["amount", "payment", "revenue", "invoice amount", "sale amount"],
  payment_status: ["payment status", "paid status", "status"],
  sale_date: ["date", "sale date", "payment date", "invoice date"],
  due_date: ["due date", "follow up date", "follow-up date"],
  message: ["message", "action", "task", "follow up", "follow-up", "reminder"],
};

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());

  return values;
}

function parseCsv(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      headers: lines[0] ? parseCsvLine(lines[0]) : [],
      rows: [] as RawImportRow[],
    };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: RawImportRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || "";
    });

    return row;
  });

  return {
    headers,
    rows,
  };
}

function guessMapping(headers: string[], recordType: ImportRecordType) {
  const mapping: ImportMapping = {};

  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  importFieldDefinitions[recordType].forEach((field) => {
    const possibleNames = [
      field.key,
      field.label,
      ...(fieldSynonyms[field.key] || []),
    ];

    const normalizedPossibleNames = possibleNames.map((name) =>
      normalizeHeader(name),
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

function isValidRecordType(value: string): value is ImportRecordType {
  return validRecordTypes.includes(value as ImportRecordType);
}

export async function POST(request: Request) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { error: "No company found for the current user." },
        { status: 401 },
      );
    }

    const formData = await request.formData();

    const recordTypeValue = String(formData.get("recordType") || "").trim();
    const uploadedFile = formData.get("csvFile");
    const mappingValue = formData.get("mapping");

    if (!isValidRecordType(recordTypeValue)) {
      return NextResponse.json(
        { error: "Choose a valid import type." },
        { status: 400 },
      );
    }

    if (!uploadedFile || typeof uploadedFile === "string") {
      return NextResponse.json(
        { error: "Upload a CSV file." },
        { status: 400 },
      );
    }

    const file = uploadedFile as File;
    const text = await file.text();

    const { headers, rows } = parseCsv(text);

    if (!headers.length || !rows.length) {
      return NextResponse.json(
        { error: "CSV must include a header row and at least one data row." },
        { status: 400 },
      );
    }

    let mapping = guessMapping(headers, recordTypeValue);

    if (typeof mappingValue === "string" && mappingValue.trim()) {
      mapping = JSON.parse(mappingValue) as ImportMapping;
    }

    const supabase = await createClient();

    const result = await createImportSessionFromRows({
      supabase,
      companyId,
      sourceType: "csv",
      sourceName: file.name,
      fileName: file.name,
      recordType: recordTypeValue,
      rows,
      mapping,
    });

    return NextResponse.json({
      ok: true,
      session_id: result.sessionId,
      summary: result.summary,
      headers,
      mapping,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create CSV import session.",
      },
      { status: 500 },
    );
  }
}
