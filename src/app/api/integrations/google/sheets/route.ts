import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import {
  extractSpreadsheetId,
  getValidGoogleAccessToken,
} from "@/lib/google-sheets";

type GoogleSpreadsheetMetadata = {
  properties?: {
    title?: string;
  };
  sheets?: {
    properties?: {
      title?: string;
      gridProperties?: {
        rowCount?: number;
      };
    };
  }[];
  error?: {
    message?: string;
  };
};

export async function GET(request: Request) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { error: "No company found for the current user." },
        { status: 401 },
      );
    }

    const requestUrl = new URL(request.url);
    const spreadsheetInput = requestUrl.searchParams.get("spreadsheetId") || "";

    if (!spreadsheetInput.trim()) {
      return NextResponse.json(
        { error: "Paste a Google Sheet URL or spreadsheet ID." },
        { status: 400 },
      );
    }

    const spreadsheetId = extractSpreadsheetId(spreadsheetInput);
    const supabase = await createClient();

    const accessToken = await getValidGoogleAccessToken({
      supabase,
      companyId,
    });

    const metadataUrl = new URL(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId,
      )}`,
    );

    metadataUrl.searchParams.set(
      "fields",
      "properties.title,sheets.properties.title,sheets.properties.gridProperties.rowCount",
    );

    const response = await fetch(metadataUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = (await response.json()) as GoogleSpreadsheetMetadata;

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message ||
            "Could not load Google Sheet. Check sharing and permissions.",
        },
        { status: response.status },
      );
    }

    const sheets =
      data.sheets
        ?.map((sheet) => ({
          title: sheet.properties?.title || "Untitled",
          rowCount: sheet.properties?.gridProperties?.rowCount || null,
        }))
        .filter((sheet) => Boolean(sheet.title)) || [];

    return NextResponse.json({
      ok: true,
      spreadsheetId,
      title: data.properties?.title || "Google Sheet",
      sheets,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Google Sheet.",
      },
      { status: 500 },
    );
  }
}
