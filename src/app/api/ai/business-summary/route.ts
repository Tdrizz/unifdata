// cspell:ignore genai
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

function getDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getStartOfMonth() {
  const now = new Date();
  return getDateOnly(new Date(now.getFullYear(), now.getMonth(), 1));
}

function getTodayString() {
  return getDateOnly(new Date());
}

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function isClosedOpportunity(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  return (
    normalized.includes("won") ||
    normalized.includes("lost") ||
    normalized.includes("cancel") ||
    normalized.includes("declined")
  );
}

function isUnpaid(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  return (
    normalized.includes("unpaid") ||
    normalized.includes("partial") ||
    normalized.includes("due") ||
    normalized.includes("overdue") ||
    normalized.includes("pending")
  );
}

function isOpenFollowUp(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  return !(
    normalized.includes("complete") ||
    normalized.includes("done") ||
    normalized.includes("closed")
  );
}

function compactText(value: string | null | undefined, fallback = "Not set") {
  const text = String(value || "").trim();
  return text || fallback;
}

export async function POST() {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing Gemini API key. Add GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY.",
      },
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

  const { company } = currentCompany;
  const supabase = await createClient();

  const startOfMonth = getStartOfMonth();
  const today = getTodayString();

  const [
    customersResult,
    leadsResult,
    jobsResult,
    salesResult,
    followUpsResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, email, address, customer_type, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(750),

    supabase
      .from("leads")
      .select(
        "id, customer_id, status, estimated_value, source, service_requested, next_follow_up_date, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(750),

    supabase
      .from("jobs")
      .select(
        "id, customer_id, lead_id, status, job_value, service_type, paid_status, start_date, completed_date, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(750),

    supabase
      .from("sales")
      .select(
        "id, amount, payment_status, sale_date, service_type, source, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(750),

    supabase
      .from("follow_ups")
      .select("id, customer_id, due_date, status, message, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(750),
  ]);

  if (customersResult.error) {
    return NextResponse.json(
      { error: customersResult.error.message },
      { status: 500 },
    );
  }

  if (leadsResult.error) {
    return NextResponse.json(
      { error: leadsResult.error.message },
      { status: 500 },
    );
  }

  if (jobsResult.error) {
    return NextResponse.json(
      { error: jobsResult.error.message },
      { status: 500 },
    );
  }

  if (salesResult.error) {
    return NextResponse.json(
      { error: salesResult.error.message },
      { status: 500 },
    );
  }

  if (followUpsResult.error) {
    return NextResponse.json(
      { error: followUpsResult.error.message },
      { status: 500 },
    );
  }

  const customers = customersResult.data || [];
  const leads = leadsResult.data || [];
  const jobs = jobsResult.data || [];
  const sales = salesResult.data || [];
  const followUps = followUpsResult.data || [];

  const customerById = new Map(
    customers.map((customer) => [customer.id, customer]),
  );

  const openLeads = leads.filter((lead) => !isClosedOpportunity(lead.status));

  const totalCustomers = customers.length;

  const customersMissingContactCount = customers.filter(
    (customer) => !customer.phone && !customer.email,
  ).length;

  const customersMissingAddressCount = customers.filter(
    (customer) => !customer.address,
  ).length;

  const openPipelineValue = openLeads.reduce(
    (sum, lead) => sum + Number(lead.estimated_value || 0),
    0,
  );

  const opportunitiesMissingFollowUpCount = openLeads.filter(
    (lead) => !lead.next_follow_up_date,
  ).length;

  const opportunitiesDueForFollowUpCount = openLeads.filter(
    (lead) => lead.next_follow_up_date && lead.next_follow_up_date <= today,
  ).length;

  const opportunitiesMissingValueCount = openLeads.filter(
    (lead) =>
      lead.estimated_value === null || lead.estimated_value === undefined,
  ).length;

  const totalRevenue = sales.reduce(
    (sum, sale) => sum + Number(sale.amount || 0),
    0,
  );

  const monthlyRevenue = sales
    .filter((sale) => sale.sale_date && sale.sale_date >= startOfMonth)
    .reduce((sum, sale) => sum + Number(sale.amount || 0), 0);

  const unpaidRevenueRecords = sales.filter((sale) =>
    isUnpaid(sale.payment_status),
  );

  const unpaidRevenue = unpaidRevenueRecords.reduce(
    (sum, sale) => sum + Number(sale.amount || 0),
    0,
  );

  const activeJobs = jobs.filter((job) => {
    const status = String(job.status || "").toLowerCase();

    return (
      status.includes("scheduled") ||
      status.includes("active") ||
      status.includes("progress")
    );
  });

  const completedJobs = jobs.filter((job) => {
    const status = String(job.status || "").toLowerCase();

    return (
      status.includes("completed") ||
      status.includes("complete") ||
      status.includes("done") ||
      status.includes("paid")
    );
  });

  const followUpsDueCount = followUps.filter(
    (followUp) =>
      isOpenFollowUp(followUp.status) &&
      followUp.due_date &&
      followUp.due_date <= today,
  ).length;

  const followUpsMissingDueDateCount = followUps.filter(
    (followUp) => isOpenFollowUp(followUp.status) && !followUp.due_date,
  ).length;

  const metrics = {
    companyName: company.name,
    date: today,
    totalCustomers,
    customersMissingContact: customersMissingContactCount,
    customersMissingAddress: customersMissingAddressCount,
    totalOpportunities: leads.length,
    openOpportunities: openLeads.length,
    openPipelineValue: formatCurrency(openPipelineValue),
    opportunitiesDueForFollowUp: opportunitiesDueForFollowUpCount,
    opportunitiesMissingFollowUp: opportunitiesMissingFollowUpCount,
    opportunitiesMissingValue: opportunitiesMissingValueCount,
    monthlyRevenue: formatCurrency(monthlyRevenue),
    totalRevenue: formatCurrency(totalRevenue),
    unpaidRevenue: formatCurrency(unpaidRevenue),
    unpaidRevenueRecords: unpaidRevenueRecords.length,
    activeJobs: activeJobs.length,
    completedJobs: completedJobs.length,
    followUpsDue: followUpsDueCount,
    followUpsMissingDueDate: followUpsMissingDueDateCount,
  };

  const workspaceData = {
    people: customers.map((customer) => ({
      name: compactText(customer.name, "Unnamed person"),
      type: compactText(customer.customer_type),
      hasPhone: Boolean(customer.phone),
      hasEmail: Boolean(customer.email),
      hasAddress: Boolean(customer.address),
      createdAt: customer.created_at,
    })),

    opportunities: leads.map((lead) => {
      const customer = lead.customer_id
        ? customerById.get(lead.customer_id)
        : null;

      return {
        service: compactText(lead.service_requested, "Untitled opportunity"),
        customer: compactText(customer?.name, "No linked person"),
        status: compactText(lead.status, "New"),
        estimatedValue: Number(lead.estimated_value || 0),
        source: compactText(lead.source),
        nextFollowUpDate: lead.next_follow_up_date || null,
        createdAt: lead.created_at,
      };
    }),

    work: jobs.map((job) => {
      const customer = job.customer_id
        ? customerById.get(job.customer_id)
        : null;

      return {
        service: compactText(job.service_type, "Untitled work"),
        customer: compactText(customer?.name, "No linked person"),
        status: compactText(job.status, "Scheduled"),
        value: Number(job.job_value || 0),
        paymentStatus: compactText(job.paid_status),
        startDate: job.start_date || null,
        completedDate: job.completed_date || null,
        createdAt: job.created_at,
      };
    }),

    revenue: sales.map((sale) => ({
      service: compactText(sale.service_type, "Revenue record"),
      amount: Number(sale.amount || 0),
      paymentStatus: compactText(sale.payment_status),
      saleDate: sale.sale_date || null,
      source: compactText(sale.source),
      createdAt: sale.created_at,
    })),

    followUps: followUps.map((followUp) => {
      const customer = followUp.customer_id
        ? customerById.get(followUp.customer_id)
        : null;

      return {
        message: compactText(followUp.message, "Follow up"),
        customer: compactText(customer?.name, "No linked person"),
        status: compactText(followUp.status, "Open"),
        dueDate: followUp.due_date || null,
        createdAt: followUp.created_at,
      };
    }),
  };

  const prompt = `
You are the AI operating assistant inside FrontierOps. Your job is to help the owner understand what to do next based on their actual workspace data.

You have access to both summary metrics and compact record-level data. Use the record-level data to be specific. If a customer, opportunity, job, payment, or follow-up appears important, mention it by name or title. Do not list everything — prioritize what matters most right now.

Rules:
- Do not invent facts or fill gaps with assumptions.
- Do not repeat phrases like "based on the data provided."
- Do not use markdown tables, bold text, or hashtags.
- Keep output in plain text only.
- Stay under 260 words.
- Sound like a practical operations assistant, not a generic analytics report.
- If there are no urgent issues, say so clearly and suggest the next useful operational check.

Always respond in this exact format:

Operating Brief
[2-4 sentences. Start with the single most important thing the owner should understand right now.]

Needs Attention
- [Item 1]
- [Item 2]
- [Item 3]

Recommended Next Steps
1. [Step one]
2. [Step two]
3. [Step three]

Metrics:
${JSON.stringify(metrics, null, 2)}

Workspace data:
${JSON.stringify(workspaceData, null, 2)}
`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
      contents: prompt,
    });

    const summary = response.text?.trim() || "No summary generated.";

    const { error: insertError } = await supabase.from("ai_reports").insert({
      company_id: company.id,
      report_type: "business_summary",
      summary,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      summary,
      metrics,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate summary.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
