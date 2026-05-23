import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import {
  createImportSessionFromRows,
  type ImportMapping,
  type ImportRecordType,
  type ImportSourceType,
  type RawImportRow,
} from "@/lib/import-engine";
import { rateLimit } from "@/lib/rate-limit";

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

    let body: {
      recordType?: string;
      sourceName?: string;
      sourceType?: string;
      rows?: RawImportRow[];
      mapping?: ImportMapping;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { recordType: recordTypeValue, sourceName, sourceType, rows, mapping } = body;

    if (!recordTypeValue || !isValidRecordType(recordTypeValue)) {
      return NextResponse.json({ error: "Choose a valid import type." }, { status: 400 });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "rows array is required and must not be empty." },
        { status: 400 },
      );
    }

    if (!mapping || typeof mapping !== "object") {
      return NextResponse.json({ error: "mapping object is required." }, { status: 400 });
    }

    const MAX_ROWS = 5000;
    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ROWS} rows per import.` },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const result = await createImportSessionFromRows({
      supabase,
      companyId,
      sourceType: (sourceType as ImportSourceType) ?? "manual",
      sourceName: sourceName ?? null,
      fileName: null,
      recordType: recordTypeValue,
      rows,
      mapping,
    });

    return NextResponse.json({
      ok: true,
      session_id: result.sessionId,
      summary: result.summary,
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
