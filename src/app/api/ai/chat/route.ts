// cspell:ignore genai
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getTodayString } from "@/lib/date-format";
import { compactText } from "@/lib/utils";
import { isClosedOpportunity, isUnpaid, isOpenFollowUp } from "@/lib/status";
import { GEMINI_MODEL } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";

type ChatMessage = {
  role: "user" | "model";
  text: string;
};

export async function POST(request: Request) {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing Gemini API key." },
      { status: 500 },
    );
  }

  const currentCompany = await getCurrentCompany();

  if (!currentCompany) {
    return NextResponse.json(
      { error: "No company found for current user." },
      { status: 401 },
    );
  }

  let body: { messages?: ChatMessage[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const messages = body.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required." },
      { status: 400 },
    );
  }

  const lastMessage = messages[messages.length - 1];

  if (lastMessage.role !== "user") {
    return NextResponse.json(
      { error: "Last message must be from user." },
      { status: 400 },
    );
  }

  const { company } = currentCompany;

  if (!rateLimit(`ai:${company.id}`, 5)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a moment." },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const profile = getIndustryProfile(company.business_sector);
  const today = getTodayString();

  const [customersResult, leadsResult, jobsResult, salesResult, followUpsResult] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, name, phone, email, address, customer_type, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(200),

      supabase
        .from("leads")
        .select(
          "id, customer_id, status, estimated_value, source, service_requested, next_follow_up_date, created_at",
        )
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(200),

      supabase
        .from("jobs")
        .select(
          "id, customer_id, status, job_value, service_type, paid_status, start_date, completed_date, created_at",
        )
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(200),

      supabase
        .from("sales")
        .select("id, amount, payment_status, sale_date, service_type, source, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(200),

      supabase
        .from("follow_ups")
        .select("id, customer_id, due_date, status, message, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  const customers = customersResult.data || [];
  const leads = leadsResult.data || [];
  const jobs = jobsResult.data || [];
  const sales = salesResult.data || [];
  const followUps = followUpsResult.data || [];

  const customerById = new Map(customers.map((c) => [c.id, c]));

  const openLeads = leads.filter((l) => !isClosedOpportunity(l.status));
  const openPipelineValue = openLeads.reduce(
    (sum, l) => sum + Number(l.estimated_value || 0),
    0,
  );
  const unpaidSales = sales.filter((s) => isUnpaid(s.payment_status));
  const overdueFollowUps = followUps.filter(
    (f) => isOpenFollowUp(f.status) && f.due_date && f.due_date <= today,
  );

  const contextSnapshot = {
    company: company.name,
    sector: profile.label,
    today,
    totals: {
      [profile.labels.customerPlural]: customers.length,
      [`open ${profile.labels.leadPlural}`]: openLeads.length,
      openPipelineValue: `$${Math.round(openPipelineValue).toLocaleString()}`,
      unpaidRecords: unpaidSales.length,
      overdueActions: overdueFollowUps.length,
    },
    [profile.labels.customerPlural]: customers.slice(0, 50).map((c) => ({
      name: compactText(c.name, "Unnamed"),
      type: compactText(c.customer_type),
      hasPhone: Boolean(c.phone),
      hasEmail: Boolean(c.email),
      hasAddress: Boolean(c.address),
    })),
    [profile.labels.leadPlural]: openLeads.slice(0, 50).map((l) => ({
      service: compactText(l.service_requested, "Untitled"),
      linkedTo: compactText(customerById.get(l.customer_id ?? "")?.name, "Unlinked"),
      status: compactText(l.status, "New"),
      value: Number(l.estimated_value || 0),
      source: compactText(l.source),
      nextFollowUp: l.next_follow_up_date || null,
    })),
    [profile.labels.jobPlural]: jobs.slice(0, 50).map((j) => ({
      service: compactText(j.service_type, "Untitled"),
      linkedTo: compactText(customerById.get(j.customer_id ?? "")?.name, "Unlinked"),
      status: compactText(j.status),
      value: Number(j.job_value || 0),
      paymentStatus: compactText(j.paid_status),
    })),
    [profile.labels.salePlural]: sales.slice(0, 50).map((s) => ({
      service: compactText(s.service_type, "Revenue record"),
      amount: Number(s.amount || 0),
      paymentStatus: compactText(s.payment_status),
      date: s.sale_date || null,
      source: compactText(s.source),
    })),
    [profile.labels.followUpPlural]: followUps.slice(0, 50).map((f) => ({
      message: compactText(f.message, "Follow up"),
      linkedTo: compactText(customerById.get(f.customer_id ?? "")?.name, "Unlinked"),
      status: compactText(f.status, "Open"),
      dueDate: f.due_date || null,
    })),
  };

  const systemInstruction = `You are the AI advisor inside UnifData for ${company.name}, a ${profile.label} business.
You have access to the owner's live workspace data. Answer questions directly and specifically using that data.
Use the correct terminology for this business: ${profile.labels.customerPlural}, ${profile.labels.leadPlural}, ${profile.labels.jobPlural}, ${profile.labels.salePlural}, ${profile.labels.followUpPlural}.

Rules:
- Be direct and specific. Mention names, amounts, and dates from the data when relevant.
- Never say "based on the data provided" or similar filler.
- No markdown formatting — no bold, no tables, no hashtags.
- Plain text only. Keep answers concise (under 200 words unless a longer answer is clearly needed).
- If asked something the data doesn't contain, say so plainly.
- Today's date is ${today}.

Workspace data:
${JSON.stringify(contextSnapshot, null, 2)}`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Build conversation history for multi-turn chat (exclude last user message, that's the new prompt)
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const chat = ai.chats.create({
      model: GEMINI_MODEL,
      config: { systemInstruction },
      history,
    });

    const response = await chat.sendMessage({
      message: lastMessage.text,
    });

    const reply = response.text?.trim() || "No response generated.";

    return NextResponse.json({ reply });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get response.";

    const isOverloaded =
      message.includes("503") ||
      message.toLowerCase().includes("unavailable") ||
      message.toLowerCase().includes("high demand") ||
      message.toLowerCase().includes("try again later");

    if (isOverloaded) {
      return NextResponse.json(
        {
          error:
            "Gemini is under high demand right now. Wait a moment and try again.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
