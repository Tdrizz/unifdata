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

  // Guardrail A: Sync loop shield — drop payloads that echo our own writes
  if (redis) {
    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ organizationId, payload }))
      .digest("hex");
    const isEcho = await redis.get(`sync_token:${hash}`);
    if (isEcho) return;
  }

  const supabase = createAdminClient();

  // Guardrail B: Exact-match bypass — if email or phone hits cleanly, update directly
  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);

  if (email || phone) {
    let query = supabase
      .from("master_customers")
      .select("id")
      .eq("organization_id", organizationId);

    if (email && phone) {
      query = query.or(`primary_email.eq.${email},primary_phone.eq.${phone}`);
    } else if (email) {
      query = query.eq("primary_email", email);
    } else if (phone) {
      query = query.eq("primary_phone", phone);
    }

    const { data: exactMatch } = await query.maybeSingle();

    if (exactMatch) {
      // Direct SQL update — no AI needed for clean exact hits
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
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
  // Auth: simple shared secret for internal/integration use
  const secret = process.env.INBOUND_SYNC_SECRET;
  if (secret) {
    const provided = req.headers.get("x-sync-secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
