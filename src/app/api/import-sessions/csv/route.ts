import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import {
  createImportSessionFromRows,
  guessImportMapping,
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

    let mapping = guessImportMapping(headers, recordTypeValue);

    if (typeof mappingValue === "string" && mappingValue.trim()) {
      mapping = JSON.parse(mappingValue) as ImportMapping;
    }

    const requestUrl = new URL(request.url);
    const analyzeOnly = requestUrl.searchParams.get("analyze") === "1";

    if (analyzeOnly) {
      return NextResponse.json({ ok: true, headers, mapping });
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
