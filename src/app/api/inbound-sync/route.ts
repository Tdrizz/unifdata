import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redis } from "@/lib/redis";
import { normalizePhone, normalizeEmail } from "@/lib/normalize";
import { getDataKeeperQueue, JOB_ANALYZE_DATA_FRAGMENT, DEFAULT_JOB_OPTIONS } from "@/lib/queue/client";
import type { InboundPayload } from "@/lib/data-keeper/types";

export const runtime = "nodejs";

type InboundBody = {
  organizationId: string;
  sourceSystem: string;
  payload: InboundPayload;
};

async function processInboundPayload(body: InboundBody) {
  const { organizationId, sourceSystem, payload } = body;

  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);

  // Guardrail A: Sync loop shield — hash matches writeSyncToken in state-engine
  if (redis) {
    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ organizationId, email: email ?? null, phone: phone ?? null }))
      .digest("hex");
    const isEcho = await redis.get(`sync_token:${hash}`);
    if (isEcho) return;
  }

  const supabase = createAdminClient();

  // Guardrail B: Exact-match bypass — if email or phone hits cleanly, update directly
  if (email || phone) {
    // Use separate parameterized .eq() queries instead of .or() string interpolation
    // to avoid PostgREST filter-string injection on unusual email characters
    let exactMatchId: string | null = null;

    if (email) {
      const { data } = await supabase
        .from("master_customers")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("primary_email", email)
        .maybeSingle();
      exactMatchId = data?.id ?? null;
    }

    if (!exactMatchId && phone) {
      const { data } = await supabase
        .from("master_customers")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("primary_phone", phone)
        .maybeSingle();
      exactMatchId = data?.id ?? null;
    }

    const exactMatch = exactMatchId ? { id: exactMatchId } : null;

    if (exactMatch) {
      // Direct SQL update — no AI needed for clean exact hits
      const updates: {
        updated_at: string;
        first_name?: string;
        last_name?: string;
        primary_email?: string;
        primary_phone?: string;
      } = { updated_at: new Date().toISOString() };
      if (payload.firstName) updates.first_name = payload.firstName.trim();
      if (payload.lastName) updates.last_name = payload.lastName.trim();
      if (email) updates.primary_email = email;
      if (phone) updates.primary_phone = phone;

      await supabase
        .from("master_customers")
        .update(updates)
        .eq("id", exactMatch.id)
        .eq("organization_id", organizationId);
      return;
    }
  }

  // Enqueue for background semantic analysis — jobId deduplicates at BullMQ level
  const jobHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ organizationId, payload }))
    .digest("hex");

  await getDataKeeperQueue().add(
    JOB_ANALYZE_DATA_FRAGMENT,
    { organizationId, sourceSystem, payload },
    { ...DEFAULT_JOB_OPTIONS, jobId: jobHash },
  );
}

export async function POST(req: NextRequest) {
  // Auth: shared secret is required — fail closed if not configured
  const secret = process.env.INBOUND_SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Endpoint not configured" }, { status: 503 });
  }
  const provided = req.headers.get("x-sync-secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: InboundBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.organizationId || !body.sourceSystem || !body.payload) {
    return NextResponse.json(
      { error: "Missing required fields: organizationId, sourceSystem, payload" },
      { status: 400 },
    );
  }

  // Return immediately — processing happens out-of-band
  void processInboundPayload(body).catch((err) => {
    console.error("[inbound-sync] Processing error:", err?.message ?? err);
  });

  return NextResponse.json({ received: true });
}
