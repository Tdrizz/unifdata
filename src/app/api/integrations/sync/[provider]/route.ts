import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import { getSyncer } from "@/lib/integrations/registry";
import { refreshIntegrationToken } from "@/lib/integrations/token";
import { rateLimit } from "@/lib/rate-limit";

// Import all syncers so they self-register via registerSyncer().
import "@/lib/integrations/quickbooks";
import "@/lib/integrations/hubspot";
import "@/lib/integrations/jobber";
import "@/lib/integrations/square";
import "@/lib/integrations/stripe";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`sync:${companyId}`)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a moment." },
      { status: 429 },
    );
  }

  const syncer = getSyncer(provider);
  if (!syncer) {
    return NextResponse.json(
      { error: `Unknown provider: ${provider}` },
      { status: 404 },
    );
  }

  const { data: integration, error: intError } = await supabase
    .from("integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", provider)
    .maybeSingle();

  if (intError || !integration) {
    return NextResponse.json(
      { error: "Integration not connected" },
      { status: 400 },
    );
  }

  try {
    await refreshIntegrationToken(supabase, integration);

    const { data: freshIntegration } = await supabase
      .from("integrations")
      .select("*")
      .eq("id", integration.id)
      .single();

    const result = await syncer.sync(supabase, companyId, freshIntegration!);
    revalidatePath("/workspace");
    revalidatePath("/customers");
    revalidatePath("/imports");
    revalidatePath("/jobs");
    revalidatePath("/sales");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
