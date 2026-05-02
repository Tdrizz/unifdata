import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import {
  createImportSessionFromRows,
  guessImportMapping,
  type ImportRecordType,
  type RawImportRow,
} from "@/lib/import-engine";
import {
  escapeSheetNameForRange,
  extractSpreadsheetId,
  getValidGoogleAccessToken,
} from "@/lib/google-sheets";

const validRecordTypes: ImportRecordType[] = [
  "relationships",
  "opportunities",
  "work",
  "revenue",
  "actions",
];

type GoogleSheetValuesResponse = {
  values?: unknown[][];
  error?: {
    message?: string;
  };
};

function isValidRecordType(value: string): value is ImportRecordType {
  return validRecordTypes.includes(value as ImportRecordType);
}

function valuesToRows(values: unknown[][]) {
  const headers = (values[0] || []).map((value) => String(value || "").trim());

  const rows = values.slice(1).map((valuesRow) => {
    const row: RawImportRow = {};

    headers.forEach((header, index) => {
      row[header] = valuesRow[index] ?? "";
    });

    return row;
  });

  return {
    headers,
    rows,
  };
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

    const body = (await request.json()) as {
      spreadsheetIdOrUrl?: string;
      sheetName?: string;
      recordType?: string;
    };

    const spreadsheetInput = String(body.spreadsheetIdOrUrl || "").trim();
    const sheetName = String(body.sheetName || "").trim();
    const recordTypeValue = String(body.recordType || "").trim();

    if (!spreadsheetInput) {
      return NextResponse.json(
        { error: "Paste a Google Sheet URL or spreadsheet ID." },
        { status: 400 },
      );
    }

    if (!sheetName) {
      return NextResponse.json(
        { error: "Choose a sheet tab." },
        { status: 400 },
      );
    }

    if (!isValidRecordType(recordTypeValue)) {
      return NextResponse.json(
        { error: "Choose a valid import type." },
        { status: 400 },
      );
    }

    const spreadsheetId = extractSpreadsheetId(spreadsheetInput);
    const supabase = await createClient();

    const accessToken = await getValidGoogleAccessToken({
      supabase,
      companyId,
    });

    const range = `'${escapeSheetNameForRange(sheetName)}'!A:ZZ`;

    const valuesUrl = new URL(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId,
      )}/values/${encodeURIComponent(range)}`,
    );

    valuesUrl.searchParams.set("majorDimension", "ROWS");
    valuesUrl.searchParams.set("valueRenderOption", "UNFORMATTED_VALUE");

    const response = await fetch(valuesUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = (await response.json()) as GoogleSheetValuesResponse;

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message || "Could not read selected Google Sheet tab.",
        },
        { status: response.status },
      );
    }

    if (!data.values || data.values.length < 2) {
      return NextResponse.json(
        {
          error:
            "The selected sheet tab needs a header row and at least one data row.",
        },
        { status: 400 },
      );
    }

    const { headers, rows } = valuesToRows(data.values);
    const mapping = guessImportMapping(headers, recordTypeValue);

    const result = await createImportSessionFromRows({
      supabase,
      companyId,
      sourceType: "google_sheets",
      sourceName: `${spreadsheetId}:${sheetName}`,
      fileName: sheetName,
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
      spreadsheet_id: spreadsheetId,
      sheet_name: sheetName,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Google Sheets import session.",
      },
      { status: 500 },
    );
  }
}
