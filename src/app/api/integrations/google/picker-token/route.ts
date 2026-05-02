import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import {
  getGoogleSheetsIntegration,
  getValidGoogleAccessToken,
} from "@/lib/google-sheets";

export async function GET() {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { error: "No company found for the current user." },
        { status: 401 },
      );
    }

    const supabase = await createClient();

    const integration = await getGoogleSheetsIntegration({
      supabase,
      companyId,
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Google Sheets is not connected." },
        { status: 400 },
      );
    }

    const accessToken = await getValidGoogleAccessToken({
      supabase,
      companyId,
    });

    return NextResponse.json({
      ok: true,
      access_token: accessToken,
      account_name: integration.provider_account_name,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Google Picker token.",
      },
      { status: 500 },
    );
  }
}
