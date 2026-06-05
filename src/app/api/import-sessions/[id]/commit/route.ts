import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import { commitImportSession } from "@/lib/import-engine";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const companyId = await getCurrentCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { error: "No company found for the current user." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const supabase = await createClient();

    const result = await commitImportSession({
      supabase,
      companyId,
      importSessionId: id,
    });

    revalidatePath("/imports");
    revalidatePath("/customers");
    revalidatePath("/leads");
    revalidatePath("/jobs");
    revalidatePath("/sales");
    revalidatePath("/follow-ups");
    revalidatePath("/workspace");
    revalidatePath("/crm");
    revalidatePath("/data-hub");
    revalidatePath("/ai-assistant");
    revalidatePath("/contacts");

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to commit import session.",
      },
      { status: 500 },
    );
  }
}
