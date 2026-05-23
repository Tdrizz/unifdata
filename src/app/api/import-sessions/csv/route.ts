import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import {
  createImportSessionFromRows,
  guessImportMapping,
  type ImportMapping,
  type ImportRecordType,
} from "@/lib/import-engine";
import { rateLimit } from "@/lib/rate-limit";
import { parseUploadedFile } from "@/lib/imports/parser";

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

export async function POST(request: Request) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { error: "No company found for the current user." },
        { status: 401 },
      );
    }

    if (!await rateLimit(`import:${companyId}`, 20)) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a moment." },
        { status: 429 },
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
        { error: "Upload a file (CSV, TSV, Excel, ODS, or Numbers)." },
        { status: 400 },
      );
    }

    const file = uploadedFile as File;

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 },
      );
    }

    const parsed = await parseUploadedFile(file);

    const { headers, rows } = parsed;

    if (!headers.length || !rows.length) {
      return NextResponse.json(
        { error: "File must include a header row and at least one data row." },
        { status: 400 },
      );
    }

    let mapping = guessImportMapping(headers, recordTypeValue);

    if (typeof mappingValue === "string" && mappingValue.trim()) {
      try {
        const userMapping = JSON.parse(mappingValue) as unknown;
        if (
          userMapping &&
          typeof userMapping === "object" &&
          !Array.isArray(userMapping)
        ) {
          mapping = userMapping as ImportMapping;
        }
      } catch {
        // ignore malformed mapping, use auto-guessed
      }
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
            : "Failed to create import session.",
      },
      { status: 500 },
    );
  }
}
