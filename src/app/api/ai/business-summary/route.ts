// cspell:ignore genai
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";

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

  // Rate limit: one brief per 10 minutes per company
  const COOLDOWN_MINUTES = 10;
  const { data: lastReport } = await supabase
    .from("ai_reports")
    .select("created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastReport) {
    const lastAt = new Date(lastReport.created_at).getTime();
    const secondsAgo = Math.floor((Date.now() - lastAt) / 1000);
    const cooldownSeconds = COOLDOWN_MINUTES * 60;

    if (secondsAgo < cooldownSeconds) {
      const secondsLeft = cooldownSeconds - secondsAgo;
      const minutesLeft = Math.ceil(secondsLeft / 60);
      return NextResponse.json(
        {
          error: `A brief was just generated. Please wait ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} before generating another.`,
          retryAfterSeconds: secondsLeft,
        },
        { status: 429 },
      );
    }
  }

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

  const profile = getIndustryProfile(company.business_sector);

  const isEmptyWorkspace =
    customers.length === 0 &&
    leads.length === 0 &&
    jobs.length === 0 &&
    sales.length === 0 &&
    followUps.length === 0;

  const metrics = {
    date: today,
    totalCustomers,
    customersMissingContact: customersMissingContactCount,
    customersMissingAddress: customersMissingAddressCount,
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
    [profile.labels.customerPlural.toLowerCase()]: customers
      .slice(0, 40)
      .map((customer) => ({
        name: compactText(customer.name, "Unnamed"),
        type: compactText(customer.customer_type),
        hasPhone: Boolean(customer.phone),
        hasEmail: Boolean(customer.email),
        hasAddress: Boolean(customer.address),
      })),

    [profile.labels.leadPlural.toLowerCase()]: leads.slice(0, 40).map((lead) => {
      const customer = lead.customer_id
        ? customerById.get(lead.customer_id)
        : null;

      return {
        service: compactText(lead.service_requested, "Untitled"),
        linkedTo: compactText(customer?.name, "No linked record"),
        status: compactText(lead.status, "New"),
        estimatedValue: Number(lead.estimated_value || 0),
        source: compactText(lead.source),
        nextFollowUpDate: lead.next_follow_up_date || null,
      };
    }),

    [profile.labels.jobPlural.toLowerCase()]: jobs.slice(0, 40).map((job) => {
      const customer = job.customer_id
        ? customerById.get(job.customer_id)
        : null;

      return {
        service: compactText(job.service_type, "Untitled"),
        linkedTo: compactText(customer?.name, "No linked record"),
        status: compactText(job.status, "Scheduled"),
        value: Number(job.job_value || 0),
        paymentStatus: compactText(job.paid_status),
        startDate: job.start_date || null,
        completedDate: job.completed_date || null,
      };
    }),

    [profile.labels.salePlural.toLowerCase()]: sales.slice(0, 40).map((sale) => ({
      service: compactText(sale.service_type, "Revenue record"),
      amount: Number(sale.amount || 0),
      paymentStatus: compactText(sale.payment_status),
      saleDate: sale.sale_date || null,
      source: compactText(sale.source),
    })),

    [profile.labels.followUpPlural.toLowerCase()]: followUps
      .slice(0, 40)
      .map((followUp) => {
        const customer = followUp.customer_id
          ? customerById.get(followUp.customer_id)
          : null;

        return {
          message: compactText(followUp.message, "Follow up"),
          linkedTo: compactText(customer?.name, "No linked record"),
          status: compactText(followUp.status, "Open"),
          dueDate: followUp.due_date || null,
        };
      }),
  };

  const systemInstruction = `You are the operating assistant inside FrontierOps, a business management platform.
Your job is to give ${company.name} a short, direct operating brief based on real workspace data.
This business runs as a ${profile.label} operation.
In this workspace: customers are called "${profile.labels.customerPlural}", leads/opportunities are called "${profile.labels.leadPlural}", active work is called "${profile.labels.jobPlural}", payments are called "${profile.labels.salePlural}", and reminders are called "${profile.labels.followUpPlural}".
Use this vocabulary throughout your brief.

Rules:
- Never invent facts. Only state what the data confirms.
- Never say "based on the data provided" or similar filler phrases.
- No markdown: no bold, no tables, no hashtags, no bullet symbols other than plain hyphens.
- Plain text only.
- Stay under 280 words.
- Sound like a practical operations advisor, not a generic analytics report.
- Use the correct vocabulary for this business type throughout.`;

  const userPrompt = isEmptyWorkspace
    ? `This is a brand-new workspace for ${company.name}, a ${profile.label} business. No records have been added yet.

Write a practical first-week setup brief. Tell the owner:
1. What to add first and why it matters for a ${profile.label}.
2. Which area creates the most operational value earliest — ${profile.labels.customerPlural}, ${profile.labels.leadPlural}, or ${profile.labels.jobPlural}.
3. The single most common early mistake businesses in this sector make when setting up a workspace like this.

Use this exact format:

Operating Brief
[2-4 sentences framing where they are and what the first week should accomplish]

Getting Started
- [First action]
- [Second action]
- [Third action]

Where to Focus First
1. [Most impactful starting point]
2. [Second priority]
3. [Common early mistake to avoid]`
    : `Here is the current workspace data for ${company.name} as of ${today}.

Summary metrics:
${JSON.stringify(metrics, null, 2)}

Record-level data (most recent records, up to 40 per category):
${JSON.stringify(workspaceData, null, 2)}

Write an operating brief. Use the record-level data to be specific — mention names, services, or amounts where they matter. Do not list everything; surface the most important items only.

Use this exact format:

Operating Brief
[2-4 sentences. Lead with the single most important thing the owner should act on today.]

Needs Attention
- [Specific item — name it if possible]
- [Specific item]
- [Specific item]

Recommended Next Steps
1. [Concrete action]
2. [Concrete action]
3. [Concrete action]`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      config: {
        systemInstruction,
      },
      contents: userPrompt,
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
