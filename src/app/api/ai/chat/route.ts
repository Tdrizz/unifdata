import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getTodayString } from "@/lib/date-format";
import { compactText } from "@/lib/utils";
import { isClosedOpportunity, isUnpaid, isOpenFollowUp } from "@/lib/status";
import { rateLimit } from "@/lib/rate-limit";
import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { isPro, isAiAllowed } from "@/lib/feature-gates";
import { getOrCreateSession, saveMessages } from "@/features/ai-assistant/queries";
import type { StoredMessage } from "@/features/ai-assistant/queries";
import { CHAT_TOOLS } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/tool-executor";
import { buildChatSystemPrompt, buildChatUserMessage, serializeContextForChat } from "@/lib/ai/prompts";

type Topic = "sales" | "customers" | "jobs" | "leads" | "followups" | "all";

function detectTopic(message: string): Topic {
  const m = message.toLowerCase();
  const matches: Topic[] = [];
  if (/sale|revenue|invoice|payment|money|income|paid|unpaid/.test(m)) matches.push("sales");
  if (/customer|client|patient|contact|person/.test(m)) matches.push("customers");
  if (/job|visit|appointment|project|schedule|work order/.test(m)) matches.push("jobs");
  if (/lead|pipeline|estimate|quote|proposal|opportunity/.test(m)) matches.push("leads");
  if (/follow.?up|task|reminder|overdue|check.?in/.test(m)) matches.push("followups");
  if (matches.length === 1) return matches[0];
  return "all";
}

export async function POST(request: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "AI service not configured." }, { status: 500 });
  }

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) {
    return NextResponse.json({ error: "No company found for current user." }, { status: 401 });
  }

  if (!isAiAllowed(currentCompany.company)) {
    return NextResponse.json(
      { error: "AI features are not available for healthcare businesses. A Business Associate Agreement (BAA) is required to process patient data with third-party AI providers." },
      { status: 403 },
    );
  }

  let body: { messages?: StoredMessage[]; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const incomingMessages = body.messages;
  if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) {
    return NextResponse.json({ error: "messages array is required." }, { status: 400 });
  }

  const lastMessage = incomingMessages[incomingMessages.length - 1];
  if (lastMessage.role !== "user") {
    return NextResponse.json({ error: "Last message must be from user." }, { status: 400 });
  }

  const { company } = currentCompany;
  const rateLimit_ = isPro(company as { tier: string }) ? 20 : 5;

  if (!await rateLimit(`ai:${company.id}`, rateLimit_)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a moment." },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const profile = getIndustryProfile(company.business_sector);
  const today = getTodayString();

  // Load or create session
  let session: { id: string; messages: StoredMessage[] };
  try {
    session = await getOrCreateSession(supabase, company.id);
  } catch {
    return NextResponse.json({ error: "Failed to initialize session." }, { status: 500 });
  }

  const userText = lastMessage.text.trim();
  const topic = detectTopic(userText);

  // Fetch relevant data rows + exact counts in parallel.
  // Counts always run so totals are accurate even when rows are capped.
  const fetchAll = topic === "all";
  const [
    customersResult, leadsResult, jobsResult, salesResult, followUpsResult,
    customerCount, leadCount, jobCount, followUpCount,
  ] = await Promise.all([
    (fetchAll || topic === "customers")
      ? supabase
          .from("customers")
          .select("id, name, phone, email, address, customer_type, created_at")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(fetchAll ? 50 : 20)
      : Promise.resolve({ data: [] }),
    (fetchAll || topic === "leads")
      ? supabase
          .from("leads")
          .select("id, customer_id, status, estimated_value, source, service_requested, next_follow_up_date, created_at")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(fetchAll ? 50 : 20)
      : Promise.resolve({ data: [] }),
    (fetchAll || topic === "jobs")
      ? supabase
          .from("jobs")
          .select("id, customer_id, status, job_value, service_type, paid_status, start_date, completed_date, created_at")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(fetchAll ? 50 : 20)
      : Promise.resolve({ data: [] }),
    (fetchAll || topic === "sales")
      ? supabase
          .from("sales")
          .select("id, amount, payment_status, sale_date, service_type, source, created_at")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(fetchAll ? 50 : 20)
      : Promise.resolve({ data: [] }),
    (fetchAll || topic === "followups")
      ? supabase
          .from("follow_ups")
          .select("id, customer_id, due_date, status, message, created_at")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(fetchAll ? 50 : 20)
      : Promise.resolve({ data: [] }),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("company_id", company.id),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("company_id", company.id),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", company.id),
    supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("company_id", company.id),
  ]);

  const customers = customersResult.data || [];
  const leads = leadsResult.data || [];
  const jobs = jobsResult.data || [];
  const sales = salesResult.data || [];
  const followUps = followUpsResult.data || [];

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const openLeads = leads.filter((l) => !isClosedOpportunity(l.status));
  const openPipelineValue = openLeads.reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);
  const unpaidSales = sales.filter((s) => isUnpaid(s.payment_status));
  const overdueFollowUps = followUps.filter(
    (f) => isOpenFollowUp(f.status) && f.due_date && f.due_date <= today,
  );

  // PII reduction: strip full names, emails, phones before sending to third-party AI.
  // Only first name + last initial is sent; contact details are omitted entirely.
  function anonymizeName(full: string | null | undefined): string {
    if (!full) return "Customer";
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }

  const contextSnapshot = {
    company: company.name,
    sector: profile.label,
    today,
    totals: {
      [profile.labels.customerPlural]: customerCount.count ?? customers.length,
      [`open ${profile.labels.leadPlural}`]: openLeads.length,
      [`total ${profile.labels.leadPlural}`]: leadCount.count ?? leads.length,
      [`total ${profile.labels.jobPlural}`]: jobCount.count ?? jobs.length,
      openPipelineValue: `$${Math.round(openPipelineValue).toLocaleString()}`,
      unpaidRecords: unpaidSales.length,
      overdueActions: overdueFollowUps.length,
      totalOpenFollowUps: followUpCount.count ?? followUps.length,
    },
    ...(customers.length > 0 && {
      [profile.labels.customerPlural]: customers.slice(0, 50).map((c) => ({
        id: c.id,
        name: anonymizeName(c.name),
        type: compactText(c.customer_type),
        hasPhone: Boolean(c.phone),
        hasEmail: Boolean(c.email),
      })),
    }),
    ...(openLeads.length > 0 && {
      [profile.labels.leadPlural]: openLeads.slice(0, 50).map((l) => ({
        id: l.id,
        service: compactText(l.service_requested, "Untitled"),
        linkedTo: anonymizeName(customerById.get(l.customer_id ?? "")?.name),
        linkedToId: l.customer_id ?? null,
        status: compactText(l.status, "New"),
        value: Number(l.estimated_value || 0),
      })),
    }),
    ...(jobs.length > 0 && {
      [profile.labels.jobPlural]: jobs.slice(0, 50).map((j) => ({
        id: j.id,
        service: compactText(j.service_type, "Untitled"),
        linkedTo: anonymizeName(customerById.get(j.customer_id ?? "")?.name),
        linkedToId: j.customer_id ?? null,
        status: compactText(j.status),
        value: Number(j.job_value || 0),
      })),
    }),
    ...(sales.length > 0 && {
      [profile.labels.salePlural]: sales.slice(0, 50).map((s) => ({
        service: compactText(s.service_type, "Revenue record"),
        amount: Number(s.amount || 0),
        paymentStatus: compactText(s.payment_status),
        date: s.sale_date || null,
      })),
    }),
    ...(followUps.length > 0 && {
      [profile.labels.followUpPlural]: followUps.slice(0, 50).map((f) => ({
        message: compactText(f.message, "Follow up"),
        linkedTo: anonymizeName(customerById.get(f.customer_id ?? "")?.name),
        status: compactText(f.status, "Open"),
        dueDate: f.due_date || null,
      })),
    }),
  };

  const systemContent = buildChatSystemPrompt(profile, company);
  const serializedContext = serializeContextForChat(
    contextSnapshot as Record<string, unknown>,
    profile,
  );

  // Build conversation history in OpenAI format
  const historyMessages = session.messages.slice(-20).map((m) => ({
    role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
    content: m.text,
  }));

  try {
    const baseMessages: Parameters<typeof aiRouter.chat.completions.create>[0]["messages"] = [
      { role: "system", content: systemContent },
      ...historyMessages,
      { role: "user", content: buildChatUserMessage(serializedContext, userText) },
    ];

    // First call (non-streaming) to detect tool calls
    const firstResponse = await aiRouter.chat.completions.create({
      model: AI_MODELS.chat,
      temperature: 0.6,
      stream: false,
      tools: CHAT_TOOLS,
      tool_choice: "auto",
      messages: baseMessages,
    });

    const firstMessage = firstResponse.choices[0]?.message;
    const toolCalls = firstMessage?.tool_calls;

    // Prepare SSE stream
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        let fullText = "";
        let toolActionSummary: string | null = null;

        if (toolCalls && toolCalls.length > 0) {
          // Execute each tool call and collect results
          const toolResults: { tool_call_id: string; result: string }[] = [];
          const actionLines: string[] = [];

          for (const tc of toolCalls) {
            if (!("function" in tc) || !tc.function) continue;
            let args: Record<string, unknown>;
            try {
              args = JSON.parse(tc.function.arguments);
            } catch {
              args = {};
            }
            const result = await executeTool(tc.function.name, args, supabase, company.id);
            toolResults.push({ tool_call_id: tc.id, result: result.message });
            if (result.success) actionLines.push(`✓ ${result.message}`);
          }

          toolActionSummary = actionLines.join("\n") || null;

          // Emit tool action bubble before streaming final reply
          if (toolActionSummary) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ toolAction: toolActionSummary })}\n\n`,
              ),
            );
          }

          // Build second call messages with tool results
          const followUpMessages: Parameters<typeof aiRouter.chat.completions.create>[0]["messages"] = [
            ...baseMessages,
            firstMessage as { role: "assistant"; content: string | null; tool_calls: NonNullable<typeof toolCalls> },
            ...toolResults.map((tr) => ({
              role: "tool" as const,
              tool_call_id: tr.tool_call_id,
              content: tr.result,
            })),
          ];

          // Second streaming call for final confirmation reply
          try {
            const followUpStream = await aiRouter.chat.completions.create({
              model: AI_MODELS.chat,
              temperature: 0.6,
              stream: true,
              messages: followUpMessages,
            });

            for await (const chunk of followUpStream) {
              const delta = chunk.choices[0]?.delta?.content ?? "";
              if (delta) {
                fullText += delta;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
            }
          } catch {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ delta: " — response interrupted. Please try again." })}\n\n`,
              ),
            );
          }
        } else {
          // No tool calls — content is in the first response; emit it token-by-token is not possible
          // after a non-streaming call, so emit the whole content as one chunk then stream nothing extra
          const content = firstMessage?.content ?? "";
          if (content) {
            fullText = content;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: content })}\n\n`));
          } else {
            // Fallback: if content is empty, do a fresh streaming call without tools
            try {
              const fallbackStream = await aiRouter.chat.completions.create({
                model: AI_MODELS.chat,
                temperature: 0.6,
                stream: true,
                messages: baseMessages,
              });
              for await (const chunk of fallbackStream) {
                const delta = chunk.choices[0]?.delta?.content ?? "";
                if (delta) {
                  fullText += delta;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                }
              }
            } catch {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ delta: " — response interrupted. Please try again." })}\n\n`,
                ),
              );
            }
          }
        }

        // Persist session
        const updatedMessages: StoredMessage[] = [
          ...session.messages,
          { role: "user", text: userText },
          { role: "model", text: fullText || toolActionSummary || "No response generated." },
        ];
        const isFirstMessage = session.messages.length === 0;
        const title = isFirstMessage ? userText.slice(0, 60) : undefined;
        await saveMessages(supabase, session.id, updatedMessages, title);

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ event: "session", sessionId: session.id })}\n\n`),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get response.";
    const isOverloaded =
      message.includes("503") ||
      message.toLowerCase().includes("unavailable") ||
      message.toLowerCase().includes("high demand") ||
      message.toLowerCase().includes("try again later");

    if (isOverloaded) {
      return NextResponse.json(
        { error: "AI service is under high demand. Wait a moment and try again." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
