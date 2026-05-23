import { NextResponse } from "next/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import { rateLimit } from "@/lib/rate-limit";
import { parseBuffer } from "@/lib/imports/parser";

const SHEET_ID_RE =
  /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;

function extractSheetId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(SHEET_ID_RE);
  if (match) return match[1];
  // Accept bare sheet IDs (alphanumeric + - _)
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  return null;
}

function buildExportUrl(sheetId: string, gid?: string): string {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&single=true`;
  return gid ? `${base}&gid=${gid}` : base;
}

export async function POST(request: Request) {
  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!await rateLimit(`import-gsheets:${companyId}`, 20)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: { url?: string; gid?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sheetId = extractSheetId(body.url ?? "");
  if (!sheetId) {
    return NextResponse.json(
      { error: "Provide a public Google Sheets URL or spreadsheet ID." },
      { status: 400 },
    );
  }

  const exportUrl = buildExportUrl(sheetId, body.gid);

  let csvBuffer: ArrayBuffer;
  try {
    const res = await fetch(exportUrl, {
      headers: { Accept: "text/csv,*/*" },
      redirect: "follow",
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          { error: "Sheet is private. Make the sheet publicly accessible (anyone with link can view) before importing." },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: `Could not fetch sheet (${res.status}).` },
        { status: 502 },
      );
    }

    csvBuffer = await res.arrayBuffer();
  } catch {
    return NextResponse.json(
      { error: "Could not reach Google Sheets. Check the URL and try again." },
      { status: 502 },
    );
  }

  try {
    const parsed = await parseBuffer(csvBuffer, "sheet.csv");

    if (!parsed.headers.length) {
      return NextResponse.json(
        { error: "Sheet appears to be empty." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      headers: parsed.headers,
      rows: parsed.rows,
      totalRows: parsed.totalRows,
      capped: parsed.totalRows > parsed.rows.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to parse sheet data." },
      { status: 500 },
    );
  }
}
